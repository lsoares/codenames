import { type DataConnection } from 'peerjs'
import type { Face } from '../Face'
import { Game, createGame, type Credit, type GameState } from '../Game'
import { Room } from './Room'
import { iceServersReady, logConnection, newPeer } from './peer'
import { RoomCode } from './RoomCode'
import type { Action, Ping, Presence, RoomView, Session, TeamClaim } from './Session'

const apply = (game: Game, action: Action): Game => {
  switch (action.type) {
    case 'clue':
      return game.giveClue(action.word, action.count)
    case 'guess':
      return game.guess(action.cardIndex)
    case 'toggleMark':
      return game.mark(action.cardIndex, action.team)
    case 'endTurn':
      return game.endTurn()
    case 'newGame':
      return game.newGame(action.faces, action.credit, action.deck)
  }
}

export class Host implements Session {
  roomCode!: string
  selfId!: string

  private readonly peer: ReturnType<typeof newPeer>
  private game: Game
  private room = new Room()
  private readonly connections: DataConnection[] = []
  private readonly listeners: Array<(view: RoomView) => void> = []
  private readonly lastSeen = new Map<DataConnection, number>()
  private heartbeat?: ReturnType<typeof setInterval>
  private opened = false
  private reconnectDelay = 0

  private readonly releaseOnUnload = (event: PageTransitionEvent): void => {
    if (!event.persisted) this.peer.destroy()
  }

  private constructor(
    private readonly code: string,
    initialState: GameState,
    private readonly mode: 'new' | 'resume',
    private readonly fixedCode: boolean,
  ) {
    this.game = new Game(initialState)
    this.peer = newPeer(code)
    window.addEventListener('pagehide', this.releaseOnUnload)
  }

  static start(
    faces: Face[],
    startingTeam: 'red' | 'blue',
    credit: Credit | null,
    deck: string,
    code?: string,
  ): Promise<Host> {
    return Host.launch(code ?? RoomCode.random().toString(), createGame(faces, startingTeam, credit, deck), 'new', 4, code != null)
  }

  static resume(roomCode: string, state: GameState): Promise<Host> {
    return Host.launch(roomCode, state, 'resume', 15, true)
  }

  private static async launch(
    code: string,
    initialState: GameState,
    mode: 'new' | 'resume',
    retries: number,
    fixedCode: boolean,
  ): Promise<Host> {
    await iceServersReady
    return new Promise((resolve, reject) =>
      new Host(code, initialState, mode, fixedCode).run(retries, resolve, reject),
    )
  }

  dispatch(action: Action): void {
    this.applyAction(action)
    this.broadcast()
  }

  private applyAction(action: Action): void {
    this.game = apply(this.game, action)
    if (action.type === 'newGame' && action.rotate) this.room = this.room.rotateSpymasters()
  }

  setSpymaster(team: 'red' | 'blue' | null): void {
    this.room = this.room.claimSeat(this.peer.id, team)
    this.broadcast()
  }

  setTeam(team: 'red' | 'blue'): void {
    this.room = this.room.setTeam(this.peer.id, team).autoSeat(this.peer.id)
    this.broadcast()
  }

  subscribe(listener: (view: RoomView) => void): void {
    this.listeners.push(listener)
    listener(this.view())
  }

  onDisconnect(): void {}

  close(): void {
    if (this.heartbeat) clearInterval(this.heartbeat)
    window.removeEventListener('pagehide', this.releaseOnUnload)
    this.peer.destroy()
  }

  private run(
    retries: number,
    resolve: (host: Host) => void,
    reject: (error: unknown) => void,
  ): void {
    this.startHeartbeat()

    this.peer.on('open', (id) => {
      this.roomCode = id
      this.selfId = id
      this.reconnectDelay = 0
      if (!this.opened) {
        this.opened = true
        const preferred = this.mode === 'new' ? this.game.state.turn : undefined
        this.room = this.room.assignTeam(id, preferred).assignEmoji(id)
        if (this.mode === 'new') this.room = this.room.autoSeat(id)
      }
      resolve(this)
    })

    this.peer.on('disconnected', () => {
      if (this.peer.destroyed) return
      this.reconnectDelay = this.reconnectDelay ? Math.min(this.reconnectDelay * 2, 30000) : 500
      setTimeout(() => {
        if (!this.peer.destroyed && this.peer.disconnected) this.peer.reconnect()
      }, this.reconnectDelay)
    })

    this.peer.on('connection', (connection) => {
      connection.on('open', () => {
        logConnection(connection)
        this.connections.push(connection)
        this.lastSeen.set(connection, Date.now())
        this.room = this.room.assignTeam(connection.peer).assignEmoji(connection.peer).autoSeat(connection.peer)
        this.broadcast()
      })
      connection.on('data', (data) => {
        this.lastSeen.set(connection, Date.now())
        if ((data as Ping).__ping) return
        if ((data as Presence).__presence) {
          this.room = this.room.claimSeat(connection.peer, (data as Presence).spymasterTeam)
        } else if ((data as TeamClaim).__team) {
          this.room = this.room.setTeam(connection.peer, (data as TeamClaim).team).autoSeat(connection.peer)
        } else {
          this.applyAction(data as Action)
        }
        this.broadcast()
      })
      connection.on('close', () => this.dropConnection(connection))
    })

    this.peer.on('error', (error: { type?: string }) => {
      if (error.type === 'unavailable-id' && retries > 0) {
        this.peer.destroy()
        window.removeEventListener('pagehide', this.releaseOnUnload)
        if (this.heartbeat) clearInterval(this.heartbeat)
        if (this.fixedCode && this.mode === 'new') return reject(error)
        const nextCode = this.mode === 'new' ? RoomCode.random().toString() : this.code
        setTimeout(
          () => Host.launch(nextCode, this.game.state, this.mode, retries - 1, this.fixedCode).then(resolve, reject),
          this.mode === 'resume' ? 800 : 0,
        )
      } else {
        reject(error)
      }
    })
  }

  private view(): RoomView {
    const ids = [this.peer.id, ...this.connections.map((connection) => connection.peer)]
    const teams = this.room.teams
    const emojis = this.room.emojis
    return {
      state: this.game.state,
      seats: this.room.seats,
      players: ids.map((id) => ({ id, team: teams[id], emoji: emojis[id] })),
    }
  }

  private broadcast(): void {
    const current = this.view()
    this.listeners.forEach((listener) => listener(current))
    this.connections.forEach((connection) => connection.open && connection.send(current))
  }

  private dropConnection(connection: DataConnection): void {
    const index = this.connections.indexOf(connection)
    if (index < 0) return
    this.connections.splice(index, 1)
    this.room = this.room.drop(connection.peer)
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
          connection.send({ __ping: true } satisfies Ping)
          if (now - (this.lastSeen.get(connection) ?? now) > 6000) this.dropConnection(connection)
        }
      }
      const present = new Set([this.peer.id, ...this.connections.map((connection) => connection.peer)])
      const settled = this.room.freeAbsentSeats(present).fillEmptySeats(present)
      if (settled !== this.room) {
        this.room = settled
        this.broadcast()
      }
    }, 2000)
  }
}
