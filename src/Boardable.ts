import type { Card, GuessOutcome, Team } from './classic/Game'

export type { GuessOutcome }

export interface Boardable {
  showsColor(cardIndex: number, isSpymaster: boolean): boolean
  canAct(cardIndex: number, viewer: { team: Team; isSpymaster: boolean }): boolean
  canMark(cardIndex: number, isSpymaster: boolean): boolean
  readonly state: { readonly cards: readonly Card[]; readonly winner: Team | null }
}
