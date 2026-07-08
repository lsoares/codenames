import type { Face } from '../Face'
import type { Credit, GameState, Team } from '../Game'
import type { Seats } from './Room'

// A wire message: what a player wants to do, sent guest → host as a plain
// serializable object, then routed onto the Game by the host.
export type Action =
  | { type: 'clue'; word: string; count: number }
  | { type: 'guess'; cardIndex: number }
  | { type: 'toggleMark'; cardIndex: number; team: Team }
  | { type: 'endTurn' }
  | { type: 'newGame'; faces?: Face[]; credit?: Credit | null; deck?: string | null; rotate?: boolean }

// Control frames on the same wire as Action/RoomView. A guest announces its
// spymaster seat (Presence) or team (TeamClaim); both sides send a Ping so each
// end detects the other going silent.
export type Presence = { __presence: true; spymasterTeam: Team | null }
export type TeamClaim = { __team: true; team: Team }
export type Ping = { __ping: true }

// One player in the room: their team and identity emoji, keyed by the peer id
// that is otherwise sealed inside the transport layer.
export interface Player {
  id: string // peerId — the network address, kept out of the rest of the app
  team: Team // auto-assigned on arrival, balanced across teams
  emoji: string // stable identity emoji, survives a team switch
}

// What every peer renders: the game, the two spymaster chairs, and the players in
// arrival order (host first — also the FIFO order used for host takeover).
export interface RoomView {
  state: GameState
  seats: Seats // one spymaster seat per team, by holder id
  players: Player[]
}

// The handle the UI holds onto a live connection, whether it's hosting or a
// guest — both a Host and a Guest are a Session.
export interface Session {
  roomCode: string
  selfId: string
  dispatch: (action: Action) => void
  setSpymaster: (team: Team | null) => void
  setTeam: (team: Team) => void
  subscribe: (listener: (view: RoomView) => void) => void
  onDisconnect: (listener: () => void) => void
  // Tear down the peer for good — used before a tab reconnects, so it never
  // leaves its old peer alive alongside the new one.
  close: () => void
}
