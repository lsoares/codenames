export type Team = 'red' | 'blue'
export type CardColor = 'red' | 'blue' | 'neutral' | 'assassin'
export type GamePhase = 'clue' | 'guess'

export interface Card {
  imageUrl: string
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

export function createGame(images: string[], startingTeam: Team): GameState {
  const otherTeam: Team = startingTeam === 'red' ? 'blue' : 'red'
  const colors = shuffle<CardColor>([
    ...Array<CardColor>(8).fill(startingTeam),
    ...Array<CardColor>(7).fill(otherTeam),
    ...Array<CardColor>(4).fill('neutral'),
    'assassin',
  ])
  return {
    cards: images.slice(0, 20).map((imageUrl, index) => ({
      imageUrl,
      color: colors[index],
      revealed: false,
      marked: false,
    })),
    turn: startingTeam,
    phase: 'clue',
    clue: null,
    guessesRemaining: 0,
    winner: null,
    log: [],
  }
}
