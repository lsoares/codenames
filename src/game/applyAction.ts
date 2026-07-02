import { createGame, type GameState, type Team } from './createGame'

export type Action =
  | { type: 'clue'; word: string; count: number }
  | { type: 'guess'; cardIndex: number }
  | { type: 'endTurn' }
  | { type: 'newGame' }

const opponent = (team: Team): Team => (team === 'red' ? 'blue' : 'red')

const unrevealedCount = (state: GameState, team: Team): number =>
  state.cards.filter((card) => card.color === team && !card.revealed).length

export function applyAction(state: GameState, action: Action): GameState {
  // A fresh game reshuffles the same pictures with a new key; allowed even after a win.
  if (action.type === 'newGame') {
    return createGame(
      state.cards.map((card) => card.imageUrl),
      Math.random() < 0.5 ? 'red' : 'blue',
    )
  }

  if (state.winner) return state

  if (action.type === 'clue') {
    if (state.phase !== 'clue') return state
    return {
      ...state,
      phase: 'guess',
      clue: { team: state.turn, word: action.word, count: action.count },
      guessesRemaining: action.count + 1,
      log: [...state.log, `${state.turn} clue: ${action.word} ${action.count}`],
    }
  }

  if (action.type === 'endTurn') {
    return {
      ...state,
      phase: 'clue',
      clue: null,
      turn: opponent(state.turn),
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
      return { ...next, guessesRemaining: 0, phase: 'clue', clue: null, turn: opponent(state.turn) }
    }
    return { ...next, guessesRemaining }
  }

  return { ...next, phase: 'clue', clue: null, turn: opponent(state.turn) }
}
