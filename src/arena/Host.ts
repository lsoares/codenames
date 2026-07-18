import type { DataConnection } from 'peerjs'
import type { Face } from '../Face'
import type { CardColor } from '../Card'
import { iceServersReady, logConnection, newPeer } from '../peer'
import { RoomCode } from '../RoomCode'
import { fetchClue } from './ai/groq'
import type { ArenaClue } from './Game'
import type {
  ArenaView,
  ArenaBoard,
  ArenaScoreEntry,
  ArenaScoreUpdate,
  ArenaPing,
} from './messages'

export class ArenaHost {
  readonly roomCode: string
  readonly selfId: string

  private readonly connections: DataConnection[] = []
  private readonly listeners: Array<(view: ArenaView) => void> = []
  private readonly lastSeen = new Map<DataConnection, number>()
  private readonly scores = new Map<string, { found: number; dead: boolean }>()
  private heartbeat?: ReturnType<typeof setInterval>
  private clueHistory: ArenaClue[] = []
  private winner: string | null = null
  private readonly peer: ReturnType<typeof newPeer>

  private constructor(
    private readonly board: ArenaBoard,
    private readonly apiKey: string,
    private readonly total: number,
    peerId: string,
  ) {
    this.peer = newPeer(peerId)
    this.roomCode = peerId
    this.selfId = peerId
    this.scores.set(peerId, { found: 0, dead: false })
    window.addEventListener('pagehide', this.releaseOnUnload)
  }

  private readonly releaseOnUnload = (event: PageTransitionEvent): void => {
    if (!event.persisted) this.peer.destroy()
  }

  static async start(
    faces: Face[],
    colors: CardColor[],
    deck: string | null,
    apiKey: string,
    code?: string,
  ): Promise<ArenaHost> {
    await iceServersReady
    const peerId = code ?? `arena-${RoomCode.random()}`
    const total = colors.filter((c) => c === 'blue').length
    const board: ArenaBoard = { faces, colors, deck }
    return new Promise((resolve, reject) => {
      const host = new ArenaHost(board, apiKey, total, peerId)
      host.run(resolve, reject)
    })
  }

  subscribe(listener: (view: ArenaView) => void): void {
    this.listeners.push(listener)
    listener(this.buildView())
  }

  updateScore(found: number, dead: boolean): void {
    this.scores.set(this.selfId, { found, dead })
    if (found >= this.total && !dead && this.winner === null) {
      this.winner = this.selfId
    }
    this.broadcast()
  }

  async requestNextClue(): Promise<void> {
    const mineWords: string[] = []
    const assassinWords: string[] = []
    const revealedWords: string[] = []

    for (let i = 0; i < this.board.faces.length; i++) {
      const face = this.board.faces[i]
      const color = this.board.colors[i]
      const word = face.kind === 'text' ? face.text : null
      if (!word) continue
      if (color === 'blue') mineWords.push(word)
      else if (color === 'assassin') assassinWords.push(word)
    }

    for (const clue of this.clueHistory) {
      if (clue.targets) revealedWords.push(...clue.targets)
    }

    const result = await fetchClue({ key: this.apiKey, mineWords, assassinWords, revealedWords })
    const clue: ArenaClue = { word: result.word, count: result.count, targets: result.targets }
    this.clueHistory = [...this.clueHistory, clue]
    this.broadcast()
  }

  close(): void {
    if (this.heartbeat) clearInterval(this.heartbeat)
    window.removeEventListener('pagehide', this.releaseOnUnload)
    this.peer.destroy()
  }

  private run(resolve: (host: ArenaHost) => void, reject: (error: unknown) => void): void {
    this.startHeartbeat()

    this.peer.on('open', () => {
      resolve(this)
    })

    this.peer.on('disconnected', () => {
      if (!this.peer.destroyed && this.peer.disconnected) this.peer.reconnect()
    })

    this.peer.on('connection', (connection) => {
      connection.on('open', () => {
        logConnection(connection)
        this.connections.push(connection)
        this.lastSeen.set(connection, Date.now())
        this.scores.set(connection.peer, { found: 0, dead: false })
        connection.send(this.buildView())
      })
      connection.on('data', (data) => {
        this.lastSeen.set(connection, Date.now())
        if ((data as ArenaPing).__arenaPing) return
        if ((data as ArenaScoreUpdate).__arenaScore) {
          const update = data as ArenaScoreUpdate
          this.scores.set(connection.peer, { found: update.found, dead: update.dead })
          if (update.found >= this.total && !update.dead && this.winner === null) {
            this.winner = connection.peer
          }
          this.broadcast()
        }
      })
      connection.on('close', () => this.dropConnection(connection))
    })

    this.peer.on('error', reject)
  }

  private buildView(): ArenaView {
    const scoreboard: ArenaScoreEntry[] = []
    for (const [id, score] of this.scores) {
      scoreboard.push({ id, found: score.found, total: this.total, dead: score.dead })
    }
    return {
      board: this.board,
      clueHistory: this.clueHistory,
      scoreboard,
      winner: this.winner,
    }
  }

  private broadcast(): void {
    const view = this.buildView()
    this.listeners.forEach((listener) => listener(view))
    this.connections.forEach((connection) => connection.open && connection.send(view))
  }

  private dropConnection(connection: DataConnection): void {
    const index = this.connections.indexOf(connection)
    if (index < 0) return
    this.connections.splice(index, 1)
    this.scores.delete(connection.peer)
    this.lastSeen.delete(connection)
    this.broadcast()
  }

  private startHeartbeat(): void {
    this.heartbeat = setInterval(() => {
      const now = Date.now()
      for (const connection of [...this.connections]) {
        if (!connection.open) {
          this.dropConnection(connection)
        } else {
          connection.send({ __arenaPing: true } satisfies ArenaPing)
          if (now - (this.lastSeen.get(connection) ?? now) > 6000) this.dropConnection(connection)
        }
      }
    }, 2000)
  }
}
