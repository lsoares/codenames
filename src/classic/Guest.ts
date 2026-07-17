import { type DataConnection } from 'peerjs'
import { iceServersReady, logConnection, newPeer, resetTabPeerId, tabPeerId } from '../peer'
import type { Action, Ping, Presence, Repick, RoomView, Session, TeamClaim, Whack } from './Session'

export type JoinFailureReason = 'room-not-found' | 'broker-unreachable' | 'connection-blocked'

export class JoinError extends Error {
  constructor(readonly reason: JoinFailureReason) {
    super(reason)
  }
}

export class Guest implements Session {
  selfId!: string

  get selfEmoji(): string {
    return this.latest?.players.find((player) => player.id === this.selfId)?.emoji ?? ''
  }

  private peer!: ReturnType<typeof newPeer>
  private connection!: DataConnection
  private readonly listeners: Array<(view: RoomView) => void> = []
  private latest: RoomView | null = null
  private disconnectHandler: () => void = () => {}
  private lastSeen = 0
  private watchdog?: ReturnType<typeof setInterval>
  private lost = false

  private readonly releaseOnUnload = (event: PageTransitionEvent): void => {
    if (!event.persisted) this.peer?.destroy()
  }

  private constructor(readonly roomCode: string) {}

  static join(roomCode: string, { waitForHost = true } = {}): Promise<Guest> {
    return new Guest(roomCode).open(waitForHost)
  }

  dispatch(action: Action): void {
    this.connection.send(action)
  }

  whack(moleId: number, reactionMs: number): void {
    this.connection.send({ __whack: true, moleId, reactionMs } satisfies Whack)
  }

  setSpymaster(team: 'red' | 'blue' | null): void {
    this.connection.send({ __presence: true, spymasterTeam: team } satisfies Presence)
  }

  setTeam(team: 'red' | 'blue'): void {
    this.connection.send({ __team: true, team } satisfies TeamClaim)
  }

  setRepicking(team: 'red' | 'blue' | null): void {
    this.connection.send({ __repick: true, team } satisfies Repick)
  }

  subscribe(listener: (view: RoomView) => void): void {
    this.listeners.push(listener)
    if (this.latest) listener(this.latest)
  }

  onDisconnect(listener: () => void): void {
    this.disconnectHandler = listener
  }

  close(): void {
    this.lost = true
    window.removeEventListener('pagehide', this.releaseOnUnload)
    if (this.watchdog) clearInterval(this.watchdog)
    this.peer.destroy()
  }

  private async open(waitForHost: boolean): Promise<Guest> {
    await iceServersReady
    window.addEventListener('pagehide', this.releaseOnUnload)
    return new Promise((resolve, reject) => {
      let phase: JoinFailureReason = 'broker-unreachable'
      let settled = false
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
        window.removeEventListener('pagehide', this.releaseOnUnload)
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
        if (phase !== 'room-not-found') phase = 'connection-blocked'
        const connection = peer.connect(this.roomCode, { reliable: true })
        this.connection = connection
        connection.on('open', () => {
          logConnection(connection)
          this.lastSeen = Date.now()
          this.watchdog = setInterval(() => {
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
        const gone = () => {
          if (connection !== this.connection) return
          if (settled) this.markLost()
          else redial(connection)
        }
        connection.on('close', gone)
        connection.on('error', gone)
      }

      const redial = (stale: DataConnection | null) => {
        const peer = this.peer
        setTimeout(() => {
          if (!settled && this.connection === stale) dial(peer)
        }, 1000)
      }

      const attempt = () => {
        if (settled) return
        const peer = newPeer(tabPeerId())
        this.peer = peer
        let dialed = false
        let reconnectDelay = 0
        peer.on('open', (selfId) => {
          this.selfId = selfId
          reconnectDelay = 0
          if (dialed) return
          dialed = true
          dial(peer)
        })
        peer.on('disconnected', () => {
          if (this.peer !== peer || peer.destroyed) return
          reconnectDelay = reconnectDelay ? Math.min(reconnectDelay * 2, 30000) : 500
          setTimeout(() => {
            if (this.peer === peer && !peer.destroyed && peer.disconnected) peer.reconnect()
          }, reconnectDelay)
        })
        peer.on('error', (error: { type?: string }) => {
          if (settled) return
          if (error.type === 'peer-unavailable') {
            phase = 'room-not-found'
            if (!waitForHost) return fail('room-not-found')
            if (!missingTimer)
              missingTimer = setTimeout(() => fail('room-not-found'), hostMissingMs())
            redial(this.connection)
          } else {
            if (error.type === 'unavailable-id') resetTabPeerId()
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

const joinWindowMs = (): number => Number(localStorage.getItem('codenames:join-window-ms')) || 15000

const hostMissingMs = (): number =>
  Number(localStorage.getItem('codenames:host-missing-ms')) || 5000
