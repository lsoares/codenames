import { type DataConnection } from 'peerjs'
import { newPeer, tabPeerId } from './peer'
import type { Action, Ping, Presence, RoomView, Session, TeamClaim } from './Session'

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

  static join(roomCode: string): Promise<Guest> {
    return Guest.connect(roomCode, 15)
  }

  private static connect(roomCode: string, retries: number): Promise<Guest> {
    return new Promise((resolve, reject) => new Guest(roomCode).run(retries, resolve, reject))
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

  private run(
    retries: number,
    resolve: (guest: Guest) => void,
    reject: (error: unknown) => void,
  ): void {
    // Reuse this tab's stable id so a reload/reconnect returns as the same peer,
    // not a ghost. The broker may still hold the id for a moment after a reload,
    // so retry on 'unavailable-id' just like the host does when re-hosting.
    const peer = newPeer(tabPeerId())
    this.peer = peer

    peer.on('open', (selfId) => {
      this.selfId = selfId
      this.connection = peer.connect(this.roomCode, { reliable: true })

      this.connection.on('open', () => {
        this.lastSeen = Date.now()
        this.watchdog = setInterval(() => {
          // Keepalive so the host knows we're still here, and detect host loss.
          if (this.connection.open) this.connection.send({ __ping: true } satisfies Ping)
          if (Date.now() - this.lastSeen > 6000) this.markLost()
        }, 2000)
        resolve(this)
      })
      this.connection.on('data', (data) => {
        this.lastSeen = Date.now()
        if ((data as Ping).__ping) return
        this.latest = data as RoomView
        this.listeners.forEach((listener) => listener(this.latest as RoomView))
      })
      this.connection.on('close', () => this.markLost())
      this.connection.on('error', () => this.markLost())
    })

    peer.on('error', (error: { type?: string }) => {
      if (error.type === 'unavailable-id' && retries > 0) {
        peer.destroy()
        setTimeout(() => Guest.connect(this.roomCode, retries - 1).then(resolve, reject), 800)
      } else {
        reject(error)
      }
    })
  }

  private markLost(): void {
    if (this.lost) return
    this.lost = true
    if (this.watchdog) clearInterval(this.watchdog)
    this.disconnectHandler()
  }
}
