import { type DataConnection } from 'peerjs'
import { Game, createGame, type Credit, type GameState } from '../Game'
import { Room } from './Room'
import { newPeer, randomCode } from './peer'
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
      return game.newGame(action.faces, action.credit)
  }
}

// The authoritative peer: owns the Game and Room, applies actions onto the game,
// broadcasts the RoomView, and prunes silent guests via heartbeat. Every guest is
// a client of one Host. Construct via Host.start (a fresh room) or Host.resume
// (re-host under the same code after a reload or FIFO takeover).
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

  private constructor(
    private readonly code: string,
    initialState: GameState,
    private readonly mode: 'new' | 'resume',
  ) {
    this.game = new Game(initialState)
    this.peer = newPeer(code)
  }

  static start(
    faces: string[],
    startingTeam: 'red' | 'blue',
    credit: Credit | null,
  ): Promise<Host> {
    return Host.launch(randomCode(), createGame(faces, startingTeam, credit), 'new', 4)
  }

  // Re-host an existing game under the same room code (host reload or FIFO
  // takeover). Generous retries: after a reload the broker holds the old id for a
  // few seconds.
  static resume(roomCode: string, state: GameState): Promise<Host> {
    return Host.launch(roomCode, state, 'resume', 15)
  }

  private static launch(
    code: string,
    initialState: GameState,
    mode: 'new' | 'resume',
    retries: number,
  ): Promise<Host> {
    return new Promise((resolve, reject) => new Host(code, initialState, mode).run(retries, resolve, reject))
  }

  dispatch(action: Action): void {
    this.game = apply(this.game, action)
    this.broadcast()
  }

  setSpymaster(team: 'red' | 'blue' | null): void {
    this.room = this.room.claimSeat(this.peer.id, team)
    this.broadcast()
  }

  setTeam(team: 'red' | 'blue'): void {
    this.room = this.room.setTeam(this.peer.id, team)
    this.broadcast()
  }

  subscribe(listener: (view: RoomView) => void): void {
    this.listeners.push(listener)
    listener(this.view())
  }

  // The host never loses its own connection, so there's nothing to notify.
  onDisconnect(): void {}

  // Step down: stop the heartbeat and drop the peer. Destroying the peer closes
  // every guest connection, so guests fall into their usual FIFO takeover.
  close(): void {
    if (this.heartbeat) clearInterval(this.heartbeat)
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
      this.room = this.room.assignTeam(id)
      // Seat the host as their team's spymaster too, just like a joiner — but only
      // for a brand-new room, so a reload or FIFO takeover doesn't hand the seat
      // (and the colour key) to whoever happens to re-host mid-game.
      if (this.mode === 'new') this.room = this.room.autoSeat(id)
      resolve(this)
    })

    this.peer.on('connection', (connection) => {
      connection.on('open', () => {
        this.connections.push(connection)
        this.lastSeen.set(connection, Date.now())
        this.room = this.room.assignTeam(connection.peer).autoSeat(connection.peer)
        this.broadcast()
      })
      connection.on('data', (data) => {
        this.lastSeen.set(connection, Date.now())
        if ((data as Ping).__ping) return // guest keepalive
        if ((data as Presence).__presence) {
          this.room = this.room.claimSeat(connection.peer, (data as Presence).spymasterTeam)
        } else if ((data as TeamClaim).__team) {
          this.room = this.room.setTeam(connection.peer, (data as TeamClaim).team)
        } else {
          this.game = apply(this.game, data as Action)
        }
        this.broadcast()
      })
      connection.on('close', () => this.dropConnection(connection))
    })

    this.peer.on('error', (error: { type?: string }) => {
      if (error.type === 'unavailable-id' && retries > 0) {
        this.peer.destroy()
        if (this.heartbeat) clearInterval(this.heartbeat) // this attempt is dead; a fresh Host starts its own
        const nextCode = this.mode === 'new' ? randomCode() : this.code
        setTimeout(
          () => Host.launch(nextCode, this.game.state, this.mode, retries - 1).then(resolve, reject),
          this.mode === 'resume' ? 800 : 0,
        )
      } else {
        reject(error)
      }
    })
  }

  private view(): RoomView {
    return {
      state: this.game.state,
      seats: this.room.seats,
      teams: this.room.teams,
      peers: [this.peer.id, ...this.connections.map((connection) => connection.peer)],
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

  // Heartbeat both ways: guests detect host loss from these pings, and the host
  // prunes guests it hasn't heard from (an abrupt tab close never fires 'close').
  // Iterate a snapshot because dropConnection() splices `connections` — mutating
  // it mid-forEach would skip the neighbour of each pruned ghost, so a burst of
  // stale peers would clear only a few per pass and linger in the count.
  private startHeartbeat(): void {
    this.heartbeat = setInterval(() => {
      const now = Date.now()
      for (const connection of [...this.connections]) {
        if (!connection.open) {
          this.dropConnection(connection) // transport already gone
        } else {
          connection.send({ __ping: true } satisfies Ping)
          if (now - (this.lastSeen.get(connection) ?? now) > 6000) this.dropConnection(connection)
        }
      }
      // Free any spymaster seat whose holder is no longer present; Room returns
      // itself unchanged when every held seat is still here, so we skip a needless
      // broadcast in the common case.
      const present = new Set([this.peer.id, ...this.connections.map((connection) => connection.peer)])
      const pruned = this.room.freeAbsentSeats(present)
      if (pruned !== this.room) {
        this.room = pruned
        this.broadcast()
      }
    }, 2000)
  }
}
