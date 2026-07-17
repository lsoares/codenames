import type { Face } from './Face'
import type { Team } from './Team'

export type CardColor = 'red' | 'blue' | 'neutral' | 'assassin'
export type GuessOutcome = 'correct' | 'wrong' | 'neutral' | 'assassin'

export interface Card {
  readonly face: Face
  readonly color: CardColor
  readonly revealed: boolean
  readonly markedBy: readonly Team[]
  readonly outcome: GuessOutcome | null
}
