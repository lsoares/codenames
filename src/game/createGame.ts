export type Team = 'red' | 'blue'
export type CardColor = 'red' | 'blue' | 'neutral' | 'assassin'
export type GamePhase = 'clue' | 'guess'
export type BoardMode = 'image' | 'word'

export interface Card {
  face: string // image URL or word, per the board's mode
  color: CardColor
  revealed: boolean
  marked: boolean
}

export interface Clue {
  team: Team
  word: string
  count: number
}

export interface GameState {
  cards: Card[]
  mode: BoardMode
  turn: Team
  phase: GamePhase
  clue: Clue | null
  guessesRemaining: number
  winner: Team | null
  log: string[]
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function createGame(faces: string[], startingTeam: Team, mode: BoardMode): GameState {
  const otherTeam: Team = startingTeam === 'red' ? 'blue' : 'red'
  const colors = shuffle<CardColor>([
    ...Array<CardColor>(8).fill(startingTeam),
    ...Array<CardColor>(7).fill(otherTeam),
    ...Array<CardColor>(4).fill('neutral'),
    'assassin',
  ])
  return {
    cards: faces.slice(0, 20).map((face, index) => ({
      face,
      color: colors[index],
      revealed: false,
      marked: false,
    })),
    mode,
    turn: startingTeam,
    phase: 'clue',
    clue: null,
    guessesRemaining: 0,
    winner: null,
    log: [],
  }
}
