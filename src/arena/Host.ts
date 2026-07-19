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
  ArenaClueRequest,
  ArenaClueResponse,
  ArenaPing,
} from './messages'

export class ArenaHost {
  readonly roomCode: string
  readonly selfId: string

  private readonly connections: DataConnection[] = []
  private readonly listeners: Array<(view: ArenaView) => void> = []
  private readonly lastSeen = new Map<DataConnection, number>()
  private readonly scores = new Map<string, { found: number; dead: boolean; timeMs: number }>()
  private readonly emojis = new Map<string, string>()
  private readonly clueCache = new Map<string, ArenaClue>()
  private readonly pendingRequests = new Set<string>()
  private heartbeat?: ReturnType<typeof setInterval>
  private winner: string | null = null
  private readonly peer: ReturnType<typeof newPeer>

  private constructor(
    private board: ArenaBoard,
    private readonly apiKey: string,
    private total: number,
    peerId: string,
  ) {
    this.peer = newPeer(peerId)
    this.roomCode = peerId
    this.selfId = peerId
    this.scores.set(peerId, { found: 0, dead: false, timeMs: 0 })
    this.emojis.set(peerId, this.nextEmoji())
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

  updateScore(found: number, dead: boolean, timeMs: number): void {
    this.scores.set(this.selfId, { found, dead, timeMs })
    if (found >= this.total && !dead && this.winner === null) {
      this.winner = this.selfId
    }
    this.broadcast()
  }

  resetBoard(faces: Face[], colors: CardColor[]): void {
    this.board = { faces, colors, deck: this.board.deck }
    this.total = colors.filter((c) => c === 'blue').length
    this.clueCache.clear()
    this.pendingRequests.clear()
    this.winner = null
    for (const [id] of this.scores) {
      this.scores.set(id, { found: 0, dead: false, timeMs: 0 })
    }
    this.broadcast()
  }

  currentView(): ArenaView {
    return this.buildView()
  }

  async requestClueFor(mineWords: string[]): Promise<ArenaClue> {
    const key = cacheKey(mineWords)
    const cached = this.clueCache.get(key)
    if (cached) return cached

    if (this.pendingRequests.has(key)) {
      return new Promise((resolve) => {
        const check = setInterval(() => {
          const result = this.clueCache.get(key)
          if (result) {
            clearInterval(check)
            resolve(result)
          }
        }, 200)
      })
    }

    this.pendingRequests.add(key)
    const assassinWords: string[] = []
    const opponentWords: string[] = []
    const neutralWords: string[] = []
    for (let i = 0; i < this.board.faces.length; i++) {
      const face = this.board.faces[i]
      if (face.kind !== 'text') continue
      if (this.board.colors[i] === 'assassin') assassinWords.push(face.text)
      else if (this.board.colors[i] === 'red') opponentWords.push(face.text)
      else if (this.board.colors[i] === 'neutral') neutralWords.push(face.text)
    }

    try {
      const result = await fetchClue({
        key: this.apiKey,
        mineWords,
        opponentWords,
        neutralWords,
        assassinWords,
        revealedWords: [],
      })
      const clue: ArenaClue = { word: result.word, count: result.count, targets: result.targets }
      this.clueCache.set(key, clue)
      return clue
    } catch (err) {
      console.error('[arena] clue request failed, retrying in 3s:', err)
      await new Promise((resolve) => setTimeout(resolve, 3000))
      return this.requestClueFor(mineWords)
    } finally {
      this.pendingRequests.delete(key)
    }
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
        this.scores.set(connection.peer, { found: 0, dead: false, timeMs: 0 })
        this.emojis.set(connection.peer, this.nextEmoji())
        connection.send(this.buildView())
      })
      connection.on('data', (data) => {
        this.lastSeen.set(connection, Date.now())
        if ((data as ArenaPing).__arenaPing) return
        if ((data as ArenaScoreUpdate).__arenaScore) {
          const update = data as ArenaScoreUpdate
          this.scores.set(connection.peer, { found: update.found, dead: update.dead, timeMs: update.timeMs })
          if (update.found >= this.total && !update.dead && this.winner === null) {
            this.winner = connection.peer
          }
          this.broadcast()
          return
        }
        if ((data as ArenaClueRequest).__clueRequest) {
          const req = data as ArenaClueRequest
          void this.requestClueFor(req.mineWords).then((clue) => {
            if (connection.open) {
              connection.send({ __clueResponse: true, clue } satisfies ArenaClueResponse)
            }
          })
        }
      })
      connection.on('close', () => this.dropConnection(connection))
    })

    this.peer.on('error', reject)
  }

  private buildView(): ArenaView {
    const scoreboard: ArenaScoreEntry[] = []
    for (const [id, score] of this.scores) {
      scoreboard.push({
        id,
        emoji: this.emojis.get(id) ?? '👤',
        found: score.found,
        total: this.total,
        dead: score.dead,
        timeMs: score.timeMs,
      })
    }
    return {
      board: this.board,
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
    this.emojis.delete(connection.peer)
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

  private nextEmoji(): string {
    const used = new Set(this.emojis.values())
    return (
      [
        '🦊',
        '🐸',
        '🦉',
        '🐼',
        '🐧',
        '🦁',
        '🐙',
        '🦄',
        '🐷',
        '🐵',
        '🦋',
        '🐝',
        '🐢',
        '🐳',
        '🦎',
      ].find((e) => !used.has(e)) ?? '👤'
    )
  }
}

function cacheKey(mineWords: string[]): string {
  return [...mineWords].sort().join(',')
}
