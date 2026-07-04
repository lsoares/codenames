import type { GameState, Team } from './createGame'

// Domain questions about a game snapshot, for the React read boundary — callers
// ask `game.inProgress`, `game.idle`, `game.isFresh`, `game.remaining('red')`
// rather than poking at raw fields. It reads the passed GameState and exposes
// no raw state of its own; the plain record stays the wire/persistence format,
// so this never goes near the network.
export const gameView = (state: GameState) => ({
  // Committed to a line of play — a clue is out or a card is revealed — and not
  // yet ended.
  get inProgress(): boolean {
    return !state.winner && (state.clue !== null || state.cards.some((card) => card.revealed))
  },
  // The complement: a fresh deal or a finished game — safe to re-deal or switch
  // sides without a prompt. A positive name so call sites read `game.idle`.
  get idle(): boolean {
    return !this.inProgress
  },
  // A freshly dealt board: nothing revealed yet.
  get isFresh(): boolean {
    return state.cards.every((card) => !card.revealed)
  },
  // Cards a team still has to find.
  remaining: (team: Team): number =>
    state.cards.filter((card) => card.color === team && !card.revealed).length,
})
