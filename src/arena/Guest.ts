import type { DataConnection } from 'peerjs'
import { iceServersReady, logConnection, newPeer, resetTabPeerId, tabPeerId } from '../peer'
import type { ArenaClue } from './Game'
import type {
  ArenaView,
  ArenaScoreUpdate,
  ArenaClueRequest,
  ArenaClueResponse,
  ArenaPing,
} from './messages'

export class ArenaGuest {
  selfId!: string

  private peer!: ReturnType<typeof newPeer>
  private connection!: DataConnection
  private readonly listeners: Array<(view: ArenaView) => void> = []
  private clueResolvers: Array<(clue: ArenaClue) => void> = []
  private latest: ArenaView | null = null
  private disconnectHandler: () => void = () => {}
  private lastSeen = 0
  private watchdog?: ReturnType<typeof setInterval>
  private lost = false

  private readonly releaseOnUnload = (event: PageTransitionEvent): void => {
    if (!event.persisted) this.peer?.destroy()
  }

  private constructor(readonly roomCode: string) {}

  static join(roomCode: string): Promise<ArenaGuest> {
    return new ArenaGuest(roomCode).open()
  }

  subscribe(listener: (view: ArenaView) => void): void {
    this.listeners.push(listener)
    if (this.latest) listener(this.latest)
  }

  onDisconnect(listener: () => void): void {
    this.disconnectHandler = listener
  }

  sendScore(found: number, dead: boolean): void {
    this.connection.send({ __arenaScore: true, found, dead } satisfies ArenaScoreUpdate)
  }

  requestClue(mineWords: string[]): Promise<ArenaClue> {
    this.connection.send({ __clueRequest: true, mineWords } satisfies ArenaClueRequest)
    return new Promise((resolve) => this.clueResolvers.push(resolve))
  }

  close(): void {
    this.lost = true
    window.removeEventListener('pagehide', this.releaseOnUnload)
    if (this.watchdog) clearInterval(this.watchdog)
    this.peer.destroy()
  }

  private async open(): Promise<ArenaGuest> {
    await iceServersReady
    window.addEventListener('pagehide', this.releaseOnUnload)
    return new Promise((resolve, reject) => {
      let settled = false

      const timer = setTimeout(() => fail('timeout'), 15000)

      const fail = (reason: string) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        window.removeEventListener('pagehide', this.releaseOnUnload)
        this.peer.destroy()
        reject(new Error(reason))
      }

      const succeed = () => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(this)
      }

      const dial = (peer: ReturnType<typeof newPeer>) => {
        if (settled || peer.destroyed) return
        const connection = peer.connect(this.roomCode, { reliable: true })
        this.connection = connection
        connection.on('open', () => {
          logConnection(connection)
          this.lastSeen = Date.now()
          this.watchdog = setInterval(() => {
            if (this.connection.open)
              this.connection.send({ __arenaPing: true } satisfies ArenaPing)
            if (Date.now() - this.lastSeen > 6000) this.markLost()
          }, 2000)
          succeed()
        })
        connection.on('data', (data) => {
          this.lastSeen = Date.now()
          if ((data as ArenaPing).__arenaPing) return
          if ((data as ArenaClueResponse).__clueResponse) {
            const resolver = this.clueResolvers.shift()
            if (resolver) resolver((data as ArenaClueResponse).clue)
            return
          }
          this.latest = data as ArenaView
          this.listeners.forEach((listener) => listener(this.latest as ArenaView))
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
            fail('room-not-found')
            return
          }
          if (error.type === 'unavailable-id') resetTabPeerId()
          peer.destroy()
          setTimeout(attempt, 800)
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
