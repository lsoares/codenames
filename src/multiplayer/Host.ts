import { type DataConnection } from 'peerjs'
import { Game, createGame, type CardFit, type Credit, type GameState } from '../Game'
import { Room } from './Room'
import { iceServersReady, logConnection, newPeer, randomRoomCode } from './peer'
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
      return game.newGame(action.faces, action.credit, action.fit, action.deck)
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
  private opened = false
  private reconnectDelay = 0

  // Release the room id to the broker on a real tab close, so a re-host isn't
  // blocked waiting for the broker to expire our ghost. Skip a bfcache freeze
  // (persisted), where the same peer will resume.
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
    faces: string[],
    startingTeam: 'red' | 'blue',
    credit: Credit | null,
    fit: CardFit,
    deck: string,
    code?: string,
  ): Promise<Host> {
    return Host.launch(code ?? randomRoomCode(), createGame(faces, startingTeam, credit, fit, deck), 'new', 4, code != null)
  }

  // Re-host an existing game under the same room code (host reload or FIFO
  // takeover). Generous retries: after a reload the broker holds the old id for a
  // few seconds.
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

  // Apply a game action plus its room side effect: a rotating new game passes each
  // team's spymaster seat to the next member, so the role goes round over games.
  private applyAction(action: Action): void {
    this.game = apply(this.game, action)
    if (action.type === 'newGame' && action.rotate) this.room = this.room.rotateSpymasters()
  }

  setSpymaster(team: 'red' | 'blue' | null): void {
    this.room = this.room.claimSeat(this.peer.id, team)
    this.broadcast()
  }

  setTeam(team: 'red' | 'blue'): void {
    // Joining a team whose spymaster seat is open takes it (autoSeat no-ops when
    // the seat is already held), so a team's first arrival becomes its spymaster.
    this.room = this.room.setTeam(this.peer.id, team).autoSeat(this.peer.id)
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
      this.reconnectDelay = 0 // a clean (re)connect resets the backoff
      // The broker re-announces our id on every (re)connect; only seed the room
      // the first time, so a reconnect after the host stepped down as spymaster
      // doesn't silently re-seat them via autoSeat.
      if (!this.opened) {
        this.opened = true
        this.room = this.room.assignTeam(id).assignEmoji(id)
        // Seat the host as their team's spymaster too, just like a joiner — but only
        // for a brand-new room, so a reload or FIFO takeover doesn't hand the seat
        // (and the colour key) to whoever happens to re-host mid-game.
        if (this.mode === 'new') this.room = this.room.autoSeat(id)
      }
      resolve(this)
    })

    // The broker socket can drop while the tab is idle or asleep, though our
    // peer-to-peer links live on. Re-register the same id so new guests can still
    // find us and the room id stays ours — no reload, no ghost to wait out. Back
    // off (capped) so a broker that keeps dropping us can't become a storm.
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
        if ((data as Ping).__ping) return // guest keepalive
        if ((data as Presence).__presence) {
          this.room = this.room.claimSeat(connection.peer, (data as Presence).spymasterTeam)
        } else if ((data as TeamClaim).__team) {
          // Auto-take the team's spymaster seat when it's open (see setTeam).
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
        if (this.heartbeat) clearInterval(this.heartbeat) // this attempt is dead; a fresh Host starts its own
        if (this.fixedCode && this.mode === 'new') return reject(error)
        const nextCode = this.mode === 'new' ? randomRoomCode() : this.code
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
      // Free any spymaster seat whose holder has left, then auto-promote a present
      // member so a team with players is never leaderless. Room returns itself
      // unchanged when nothing moved, so we skip a needless broadcast.
      const present = new Set([this.peer.id, ...this.connections.map((connection) => connection.peer)])
      const settled = this.room.freeAbsentSeats(present).fillEmptySeats(present)
      if (settled !== this.room) {
        this.room = settled
        this.broadcast()
      }
    }, 2000)
  }
}
