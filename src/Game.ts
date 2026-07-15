import type { Face } from './Face'

export type Team = 'red' | 'blue'
export type CardColor = 'red' | 'blue' | 'neutral' | 'assassin'
export type GamePhase = 'clue' | 'guess'

export interface Credit {
  readonly label: string
  readonly url: string
}

export interface Card {
  readonly face: Face
  readonly color: CardColor
  readonly revealed: boolean
  readonly markedBy: readonly Team[]
  readonly outcome: GuessOutcome | null
}

export interface Clue {
  readonly team: Team
  readonly word: string
  readonly count: number
}

export const UNLIMITED_CLUE = -1

export const unlimitedClueHint = (zero: boolean): string =>
  zero
    ? 'Zero: none of these cards match the clue, so your team may keep guessing until they miss.'
    : 'Unlimited: your team may guess as many cards as they like, until they miss.'

export interface GameState {
  readonly cards: readonly Card[]
  readonly deck: string | null
  readonly credit: Credit | null
  readonly turn: Team
  readonly phase: GamePhase
  readonly clue: Clue | null
  readonly clueHistory: readonly Clue[]
  readonly guessesRemaining: number
  readonly winner: Team | null
  readonly log: readonly string[]
}

export type GuessOutcome = 'correct' | 'wrong' | 'neutral' | 'assassin'

export type ActingRole = 'spymaster' | 'operatives'

export interface Transition {
  newGame: boolean
  clueGiven: Clue | null
  guessed: { index: number; card: Card; outcome: GuessOutcome } | null
  turnPassed: { from: Team; to: Team } | null
  win: { team: Team; byAssassin: boolean } | null
}

export function createGame(
  faces: readonly Face[],
  startingTeam: Team,
  credit: Credit | null = null,
  deck: string | null = null,
): GameState {
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
      markedBy: [],
      outcome: null,
    })),
    deck,
    credit,
    turn: startingTeam,
    phase: 'clue',
    clue: null,
    clueHistory: [],
    guessesRemaining: 0,
    winner: null,
    log: [],
  }
}

export class Game {
  constructor(private readonly s: GameState) {}

  get state(): GameState {
    return this.s
  }

  inProgress(): boolean {
    return !this.s.winner && (this.s.clue !== null || this.s.cards.some((card) => card.revealed))
  }

  idle(): boolean {
    return !this.inProgress()
  }

  isFresh(): boolean {
    return this.s.cards.every((card) => !card.revealed)
  }

  remaining(team: Team): number {
    return unrevealedCount(this.s, team)
  }

  awaitingRole(): ActingRole {
    return this.s.phase === 'clue' ? 'spymaster' : 'operatives'
  }

  hasUnlimitedClue(): boolean {
    return this.s.clue !== null && unlimitedGuesses(this.s.clue.count)
  }

  meansUnlimited(count: number): boolean {
    return count > this.remaining(this.s.turn)
  }

  maxClueCount(): number {
    return this.remaining(this.s.turn) + 1
  }

  guessesGiven(): number {
    return this.s.clue ? startingGuesses(this.s.clue.count) : 0
  }

  guessesUsed(): number {
    return this.s.clue ? this.guessesGiven() - this.s.guessesRemaining : 0
  }

  guessesUsable(): number {
    return this.s.clue
      ? Math.min(this.guessesGiven(), this.remaining(this.s.turn) + this.guessesUsed())
      : 0
  }

  hasGuessedThisTurn(): boolean {
    return this.s.clue !== null && this.s.guessesRemaining !== startingGuesses(this.s.clue.count)
  }

  showsColor(cardIndex: number, isSpymaster: boolean): boolean {
    return this.s.cards[cardIndex].revealed || isSpymaster || this.s.winner !== null
  }

  canAct(cardIndex: number, viewer: { team: Team; isSpymaster: boolean }): boolean {
    const card = this.s.cards[cardIndex]
    if (this.s.winner || card.revealed || this.s.turn !== viewer.team) return false
    return viewer.isSpymaster ? card.color === viewer.team : this.s.phase === 'guess'
  }

  canMark(cardIndex: number, isSpymaster: boolean): boolean {
    return !isSpymaster && !this.s.cards[cardIndex].revealed && !this.s.winner
  }

  newGame(faces?: readonly Face[], credit?: Credit | null, deck?: string | null): Game {
    return new Game(
      createGame(
        faces ?? this.s.cards.map((card) => card.face),
        Math.random() < 0.5 ? 'red' : 'blue',
        credit === undefined ? this.s.credit : credit,
        deck === undefined ? this.s.deck : deck,
      ),
    )
  }

  mark(cardIndex: number, team: Team): Game {
    if (this.s.winner) return this
    const target = this.s.cards[cardIndex]
    if (!target || target.revealed) return this
    return new Game({
      ...this.s,
      cards: this.s.cards.map((card, index) =>
        index === cardIndex
          ? {
              ...card,
              markedBy: card.markedBy.includes(team)
                ? card.markedBy.filter((t) => t !== team)
                : [...card.markedBy, team],
            }
          : card,
      ),
    })
  }

  giveClue(word: string, count: number): Game {
    if (this.s.winner || this.s.phase !== 'clue') return this
    return new Game({
      ...this.s,
      phase: 'guess',
      guessesRemaining: startingGuesses(count),
      clue: { team: this.s.turn, word, count },
      clueHistory: [...this.s.clueHistory, { team: this.s.turn, word, count }],
      log: [...this.s.log, `${this.s.turn} clue: ${word} ${count}`],
    })
  }

  endTurn(): Game {
    if (this.s.winner || !this.hasGuessedThisTurn()) return this
    return new Game({
      ...this.s,
      phase: 'clue',
      clue: null,
      turn: opponent(this.s.turn),
      cards: clearMarks(this.s.cards, this.s.turn),
      log: [...this.s.log, `${this.s.turn} ended their turn`],
    })
  }

  guess(cardIndex: number): Game {
    if (this.s.winner || this.s.phase !== 'guess') return this
    const card = this.s.cards[cardIndex]
    if (!card || card.revealed) return this

    const next: GameState = {
      ...this.s,
      cards: this.s.cards.map((current, index) =>
        index === cardIndex
          ? { ...current, revealed: true, outcome: outcomeOf(current, this.s.turn) }
          : current,
      ),
      log: [...this.s.log, `${this.s.turn} guessed ${card.color}`],
    }

    if (card.color === 'assassin') {
      return new Game({ ...next, winner: opponent(this.s.turn), phase: 'clue', clue: null })
    }
    if (unrevealedCount(next, 'red') === 0) {
      return new Game({ ...next, winner: 'red', phase: 'clue', clue: null })
    }
    if (unrevealedCount(next, 'blue') === 0) {
      return new Game({ ...next, winner: 'blue', phase: 'clue', clue: null })
    }

    if (card.color === this.s.turn) {
      const guessesRemaining = this.s.guessesRemaining - 1
      if (guessesRemaining <= 0) {
        return new Game({
          ...next,
          guessesRemaining: 0,
          phase: 'clue',
          clue: null,
          turn: opponent(this.s.turn),
          cards: clearMarks(next.cards, this.s.turn),
        })
      }
      return new Game({ ...next, guessesRemaining })
    }

    return new Game({
      ...next,
      phase: 'clue',
      clue: null,
      turn: opponent(this.s.turn),
      cards: clearMarks(next.cards, this.s.turn),
    })
  }

  changesFrom(prev: Game): Transition {
    const before = prev.s
    const after = this.s
    if (after.log.length < before.log.length) {
      return { newGame: true, clueGiven: null, guessed: null, turnPassed: null, win: null }
    }
    const index = after.cards.findIndex((card, i) => card.revealed && !before.cards[i].revealed)
    const card = index >= 0 ? after.cards[index] : null
    const winner = before.winner ? null : after.winner
    return {
      newGame: false,
      clueGiven: before.phase === 'clue' && after.phase === 'guess' ? after.clue : null,
      guessed: card ? { index, card, outcome: outcomeOf(card, before.turn) } : null,
      turnPassed: before.turn === after.turn ? null : { from: before.turn, to: after.turn },
      win: winner ? { team: winner, byAssassin: card?.color === 'assassin' } : null,
    }
  }
}

const shuffle = <T>(items: T[]): T[] => {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

const opponent = (team: Team): Team => (team === 'red' ? 'blue' : 'red')

const unlimitedGuesses = (count: number): boolean => count === 0 || count === UNLIMITED_CLUE

// a big finite number, not Infinity — JSON.stringify would turn Infinity to null
const UNLIMITED_GUESSES = 99

const startingGuesses = (count: number): number =>
  unlimitedGuesses(count) ? UNLIMITED_GUESSES : count + 1

const clearMarks = (cards: readonly Card[], team: Team): Card[] =>
  cards.map((card) =>
    card.markedBy.includes(team)
      ? { ...card, markedBy: card.markedBy.filter((t) => t !== team) }
      : card,
  )

const unrevealedCount = (state: GameState, team: Team): number =>
  state.cards.filter((card) => card.color === team && !card.revealed).length

const outcomeOf = (card: Card, guessingTeam: Team): GuessOutcome =>
  card.color === 'assassin'
    ? 'assassin'
    : card.color === 'neutral'
      ? 'neutral'
      : card.color === guessingTeam
        ? 'correct'
        : 'wrong'
