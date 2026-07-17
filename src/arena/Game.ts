import type { Face } from '../Face'
import type { BoardSize, Card, CardColor, Credit, GuessOutcome, Team } from '../classic/Game'
import { shuffle } from '../shuffle'

export interface ArenaClue {
  readonly word: string
  readonly count: number
  readonly targets?: readonly string[]
}

export interface ArenaGameState {
  readonly cards: readonly Card[]
  readonly deck: string | null
  readonly credit: Credit | null
  readonly clue: ArenaClue | null
  readonly clueHistory: readonly ArenaClue[]
  readonly guessesRemaining: number
  readonly result: 'playing' | 'win' | 'dead'
}

export function createArenaGame(
  faces: readonly Face[],
  deck: string | null,
  credit: Credit | null,
  boardSize: BoardSize,
): ArenaGameState {
  const { mine, assassins } =
    boardSize === '5x5' ? { mine: 15, assassins: 10 } : { mine: 12, assassins: 8 }
  const colors = shuffle<CardColor>([
    ...Array<CardColor>(mine).fill('blue'),
    ...Array<CardColor>(assassins).fill('assassin'),
  ])
  return {
    cards: faces.slice(0, colors.length).map((face, index) => ({
      face,
      color: colors[index],
      revealed: false,
      markedBy: [],
      outcome: null,
    })),
    deck,
    credit,
    clue: null,
    clueHistory: [],
    guessesRemaining: 0,
    result: 'playing',
  }
}

export class ArenaGame {
  constructor(private readonly s: ArenaGameState) {}

  get state(): ArenaGameState & {
    readonly winner: Team | null
    readonly turn: Team
    readonly phase: 'clue' | 'guess'
  } {
    const winner = this.s.result === 'playing' ? null : ('blue' as Team)
    return { ...this.s, winner, turn: 'blue' as Team, phase: this.s.clue ? 'guess' : 'clue' }
  }

  mineCount(): number {
    return this.s.cards.filter((c) => c.color === 'blue').length
  }

  unrevealedMineCount(): number {
    return this.s.cards.filter((c) => c.color === 'blue' && !c.revealed).length
  }

  showsColor(cardIndex: number, isSpymaster: boolean): boolean {
    return isSpymaster || this.s.cards[cardIndex].revealed || this.s.result !== 'playing'
  }

  canAct(cardIndex: number, viewer: { team: Team; isSpymaster: boolean }): boolean {
    if (this.s.result !== 'playing' || this.s.cards[cardIndex].revealed) return false
    if (viewer.isSpymaster) return this.s.cards[cardIndex].color === 'blue'
    return this.s.clue !== null && this.s.guessesRemaining > 0
  }

  canMark(_cardIndex: number, isSpymaster: boolean): boolean {
    return !isSpymaster && this.s.result === 'playing'
  }

  mark(cardIndex: number): ArenaGame {
    if (this.s.result !== 'playing') return this
    const target = this.s.cards[cardIndex]
    if (!target || target.revealed) return this
    return new ArenaGame({
      ...this.s,
      cards: this.s.cards.map((card, index) =>
        index === cardIndex
          ? {
              ...card,
              markedBy: card.markedBy.includes('blue' as Team)
                ? card.markedBy.filter((t) => t !== 'blue')
                : [...card.markedBy, 'blue' as Team],
            }
          : card,
      ),
    })
  }

  isVisible(word: string): boolean {
    const target = word.trim().toLowerCase()
    if (!target) return false
    return this.s.cards.some(
      (card) =>
        !card.revealed && card.face.kind === 'text' && card.face.text.toLowerCase() === target,
    )
  }

  meansUnlimited(_count: number): boolean {
    return false
  }

  maxClueCount(): number {
    return this.unrevealedMineCount()
  }

  receiveClue(word: string, count: number, targets?: string[]): ArenaGame {
    if (this.s.result !== 'playing' || this.s.clue !== null) return this
    const clue: ArenaClue = { word, count, targets }
    return new ArenaGame({
      ...this.s,
      clue,
      clueHistory: [...this.s.clueHistory, clue],
      guessesRemaining: count,
    })
  }

  guess(cardIndex: number): ArenaGame {
    if (this.s.result !== 'playing' || !this.s.clue || this.s.guessesRemaining <= 0) return this
    const card = this.s.cards[cardIndex]
    if (!card || card.revealed) return this

    const outcome: GuessOutcome = card.color === 'assassin' ? 'assassin' : 'correct'
    const cards = this.s.cards.map((c, i) =>
      i === cardIndex ? { ...c, revealed: true, outcome } : c,
    )

    if (card.color === 'assassin') {
      return new ArenaGame({ ...this.s, cards, result: 'dead', clue: null, guessesRemaining: 0 })
    }

    const remaining = this.s.guessesRemaining - 1
    const allMineRevealed = cards.filter((c) => c.color === 'blue' && !c.revealed).length === 0

    if (allMineRevealed) {
      return new ArenaGame({ ...this.s, cards, result: 'win', clue: null, guessesRemaining: 0 })
    }

    return new ArenaGame({
      ...this.s,
      cards,
      guessesRemaining: remaining,
      clue: remaining <= 0 ? null : this.s.clue,
    })
  }
}
