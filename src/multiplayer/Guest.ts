import { type DataConnection } from 'peerjs'
import { iceServersReady, logConnection, newPeer, tabPeerId } from './peer'
import type { Action, Ping, Presence, RoomView, Session, TeamClaim } from './Session'

// What a failed join concluded, so the UI can give the right advice instead of
// blaming the room code for every failure.
export type JoinFailureReason =
  | 'room-not-found' // the broker answered, but no host holds that code
  | 'broker-unreachable' // never (stably) reached the signaling broker
  | 'connection-blocked' // host found, but the peer link never opened (NAT/firewall)

export class JoinError extends Error {
  constructor(readonly reason: JoinFailureReason) {
    super(reason)
  }
}

// How long a join keeps trying before rejecting with a JoinError. Generous: a
// cross-network guest gathers STUN/TURN candidates and completes ICE over the
// internet, which routinely takes several seconds — and a host mid-reload or
// mid-takeover needs a few more to reclaim the room id. Tests shrink it via
// localStorage to exercise the failure paths quickly.
const joinWindowMs = (): number =>
  Number(localStorage.getItem('codenames:join-window-ms')) || 15000

// Once the broker says the room isn't registered, keep trying only this long —
// a host may be mid-setup or mid-takeover — before giving up with room-not-found.
// Far shorter than the connect window: a missing room is a near-verdict, so we
// mustn't sit on "Connecting…" for the full window waiting out slow ICE that will
// never happen (there's no host to reach). Tests shrink it via localStorage.
const hostMissingMs = (): number =>
  Number(localStorage.getItem('codenames:host-missing-ms')) || 5000

// A client peer: connects to a Host by room code, forwards the player's actions
// onto the wire, renders the RoomView the host broadcasts back, and watches the
// heartbeat so it can report the host going silent. Construct via Guest.join.
export class Guest implements Session {
  selfId!: string
  private peer!: ReturnType<typeof newPeer>
  private connection!: DataConnection
  private readonly listeners: Array<(view: RoomView) => void> = []
  private latest: RoomView | null = null
  private disconnectHandler: () => void = () => {}
  private lastSeen = 0
  private watchdog?: ReturnType<typeof setInterval>
  private lost = false

  private constructor(readonly roomCode: string) {}

  // Join a room, retrying transient failures — a broker hiccup or rate limit, a
  // host mid-reload or mid-takeover — until the join window closes, then reject
  // with a JoinError saying why. waitForHost=false fails fast on a missing room
  // instead: for the reloading host's own tab, whose next move is to re-host.
  static join(roomCode: string, { waitForHost = true } = {}): Promise<Guest> {
    return new Guest(roomCode).open(waitForHost)
  }

  dispatch(action: Action): void {
    this.connection.send(action)
  }

  setSpymaster(team: 'red' | 'blue' | null): void {
    this.connection.send({ __presence: true, spymasterTeam: team } satisfies Presence)
  }

  setTeam(team: 'red' | 'blue'): void {
    this.connection.send({ __team: true, team } satisfies TeamClaim)
  }

  subscribe(listener: (view: RoomView) => void): void {
    this.listeners.push(listener)
    if (this.latest) listener(this.latest)
  }

  onDisconnect(listener: () => void): void {
    this.disconnectHandler = listener
  }

  // Leave for good: stop the watchdog, suppress the disconnect handler (we're
  // going on purpose), and drop the peer — freeing our tab id so a reconnect can
  // reclaim it.
  close(): void {
    this.lost = true
    if (this.watchdog) clearInterval(this.watchdog)
    this.peer.destroy()
  }

  private async open(waitForHost: boolean): Promise<Guest> {
    await iceServersReady
    return new Promise((resolve, reject) => {
      // What the timeout should report if the window closes now — updated as the
      // join progresses, so the last thing we were stuck on names the failure.
      let phase: JoinFailureReason = 'broker-unreachable'
      let settled = false
      // Armed the moment the broker first reports the room missing, so we give up
      // on a dead room well before the (much longer) connect window would.
      let missingTimer: ReturnType<typeof setTimeout> | undefined

      const timer = setTimeout(() => fail(phase), joinWindowMs())
      const clearTimers = () => {
        clearTimeout(timer)
        if (missingTimer) clearTimeout(missingTimer)
      }

      const fail = (reason: JoinFailureReason) => {
        if (settled) return
        settled = true
        clearTimers()
        this.peer.destroy()
        reject(new JoinError(reason))
      }

      const succeed = () => {
        if (settled) return
        settled = true
        clearTimers()
        resolve(this)
      }

      const dial = (peer: ReturnType<typeof newPeer>) => {
        if (settled || peer.destroyed) return
        // Once the broker has said the room isn't registered, that stays the
        // verdict: the broker only reports it after its own multi-second grace,
        // so a redial rarely hears back again before the window closes — and a
        // dead room is far likelier than a host appearing mid-join.
        if (phase !== 'room-not-found') phase = 'connection-blocked'
        const connection = peer.connect(this.roomCode, { reliable: true })
        this.connection = connection
        connection.on('open', () => {
          logConnection(connection)
          this.lastSeen = Date.now()
          this.watchdog = setInterval(() => {
            // Keepalive so the host knows we're still here, and detect host loss.
            if (this.connection.open) this.connection.send({ __ping: true } satisfies Ping)
            if (Date.now() - this.lastSeen > 6000) this.markLost()
          }, 2000)
          succeed()
        })
        connection.on('data', (data) => {
          this.lastSeen = Date.now()
          if ((data as Ping).__ping) return
          this.latest = data as RoomView
          this.listeners.forEach((listener) => listener(this.latest as RoomView))
        })
        // A superseded dial's connection must not speak for the live one; while
        // still joining, a dropped attempt just means dial again.
        const gone = () => {
          if (connection !== this.connection) return
          if (settled) this.markLost()
          else redial(connection)
        }
        connection.on('close', gone)
        connection.on('error', gone)
      }

      // Try the same room again in a moment — but only if no other path (a
      // fresh peer, a competing redial) has replaced this attempt meanwhile.
      const redial = (stale: DataConnection | null) => {
        const peer = this.peer
        setTimeout(() => {
          if (!settled && this.connection === stale) dial(peer)
        }, 1000)
      }

      const attempt = () => {
        if (settled) return
        // Reuse this tab's stable id so a reload/reconnect returns as the same
        // peer, not a ghost.
        const peer = newPeer(tabPeerId())
        this.peer = peer
        peer.on('open', (selfId) => {
          this.selfId = selfId
          dial(peer)
        })
        peer.on('error', (error: { type?: string }) => {
          if (settled) return
          if (error.type === 'peer-unavailable') {
            // The room id isn't registered right now. The host may be mid-reload
            // or mid-takeover, so keep dialing on the same peer — unless the
            // caller wants the verdict immediately (waitForHost=false). Either
            // way, don't wait the whole connect window: give up shortly if no
            // host shows up.
            phase = 'room-not-found'
            if (!waitForHost) return fail('room-not-found')
            if (!missingTimer) missingTimer = setTimeout(() => fail('room-not-found'), hostMissingMs())
            redial(this.connection)
          } else {
            // Anything else — the broker still holding our tab id after a reload
            // ('unavailable-id'), a rate limit, a dropped socket — gets a fresh
            // peer until the window closes.
            phase = 'broker-unreachable'
            peer.destroy()
            setTimeout(attempt, 800)
          }
        })
      }

      attempt()
    })
  }

  private markLost(): void {
    if (this.lost) return
    this.lost = true
    if (this.watchdog) clearInterval(this.watchdog)
    this.disconnectHandler()
  }
}
