import { createGame, type BoardMode, type Card, type GameState, type Team } from './createGame'

export type Action =
  | { type: 'clue'; word: string; count: number }
  | { type: 'guess'; cardIndex: number }
  | { type: 'toggleMark'; cardIndex: number; team: Team }
  | { type: 'endTurn' }
  | { type: 'newGame'; faces?: string[]; mode?: BoardMode }

const opponent = (team: Team): Team => (team === 'red' ? 'blue' : 'red')

// A team's candidate marks are its own planning note; wipe them when that
// team's turn ends (they've had their go), leaving the other team's forward
// marks intact so they survive across the opponent's turn.
const clearMarks = (cards: Card[], team: Team): Card[] =>
  cards.map((card) =>
    card.markedBy.includes(team)
      ? { ...card, markedBy: card.markedBy.filter((t) => t !== team) }
      : card,
  )

const unrevealedCount = (state: GameState, team: Team): number =>
  state.cards.filter((card) => card.color === team && !card.revealed).length

export function applyAction(state: GameState, action: Action): GameState {
  // A fresh game: new faces when the caller fetched some, else reshuffle the
  // current ones (keeping the board's mode). Allowed even after a win.
  if (action.type === 'newGame') {
    return createGame(
      action.faces ?? state.cards.map((card) => card.face),
      Math.random() < 0.5 ? 'red' : 'blue',
      action.mode ?? state.mode,
    )
  }

  if (state.winner) return state

  // A team's candidate marks — a private note toggled by right-click, allowed
  // on any turn so operatives can plan ahead while the opponent plays.
  if (action.type === 'toggleMark') {
    const target = state.cards[action.cardIndex]
    if (!target || target.revealed) return state
    return {
      ...state,
      cards: state.cards.map((card, index) =>
        index === action.cardIndex
          ? {
              ...card,
              markedBy: card.markedBy.includes(action.team)
                ? card.markedBy.filter((t) => t !== action.team)
                : [...card.markedBy, action.team],
            }
          : card,
      ),
    }
  }

  if (action.type === 'clue') {
    if (state.phase !== 'clue') return state
    return {
      ...state,
      phase: 'guess',
      // A normal clue grants count + 1 guesses; a 0 clue is "unlimited" — a big
      // finite number (not Infinity, which JSON.stringify would turn to null).
      guessesRemaining: action.count === 0 ? 99 : action.count + 1,
      clue: { team: state.turn, word: action.word, count: action.count },
      log: [...state.log, `${state.turn} clue: ${action.word} ${action.count}`],
    }
  }

  if (action.type === 'endTurn') {
    return {
      ...state,
      phase: 'clue',
      clue: null,
      turn: opponent(state.turn),
      cards: clearMarks(state.cards, state.turn),
      log: [...state.log, `${state.turn} ended their turn`],
    }
  }

  if (state.phase !== 'guess') return state
  const card = state.cards[action.cardIndex]
  if (!card || card.revealed) return state

  const next: GameState = {
    ...state,
    cards: state.cards.map((current, index) =>
      index === action.cardIndex ? { ...current, revealed: true } : current,
    ),
    log: [...state.log, `${state.turn} guessed ${card.color}`],
  }

  if (card.color === 'assassin') {
    return { ...next, winner: opponent(state.turn), phase: 'clue', clue: null }
  }
  if (unrevealedCount(next, 'red') === 0) {
    return { ...next, winner: 'red', phase: 'clue', clue: null }
  }
  if (unrevealedCount(next, 'blue') === 0) {
    return { ...next, winner: 'blue', phase: 'clue', clue: null }
  }

  if (card.color === state.turn) {
    const guessesRemaining = state.guessesRemaining - 1
    if (guessesRemaining <= 0) {
      return {
        ...next,
        guessesRemaining: 0,
        phase: 'clue',
        clue: null,
        turn: opponent(state.turn),
        cards: clearMarks(next.cards, state.turn),
      }
    }
    return { ...next, guessesRemaining }
  }

  return {
    ...next,
    phase: 'clue',
    clue: null,
    turn: opponent(state.turn),
    cards: clearMarks(next.cards, state.turn),
  }
}
