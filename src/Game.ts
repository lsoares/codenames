export type Team = 'red' | 'blue'
export type CardColor = 'red' | 'blue' | 'neutral' | 'assassin'
export type GamePhase = 'clue' | 'guess'
export type BoardMode = 'image' | 'word'

export interface Card {
  face: string // image URL or word, per the board's mode
  color: CardColor
  revealed: boolean
  markedBy: Team[] // operative candidate notes, private to each team
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
      markedBy: [],
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

// The rules as an object: query it, or run an operation to get the next Game. It
// wraps an immutable GameState — every operation returns a new Game rather than
// mutating this one.
export class Game {
  constructor(private readonly s: GameState) {}

  get state(): GameState {
    return this.s
  }

  // Committed to a line of play — a clue is out or a card is revealed — and not
  // yet ended.
  inProgress(): boolean {
    return !this.s.winner && (this.s.clue !== null || this.s.cards.some((card) => card.revealed))
  }

  // The complement: a fresh deal or a finished game. A positive name so call
  // sites read `game.idle()` rather than negating.
  idle(): boolean {
    return !this.inProgress()
  }

  isFresh(): boolean {
    return this.s.cards.every((card) => !card.revealed)
  }

  remaining(team: Team): number {
    return unrevealedCount(this.s, team)
  }

  // A fresh game: new faces when the caller fetched some, else reshuffle the
  // current ones (keeping the board's mode). Allowed even after a win.
  newGame(faces?: string[], mode?: BoardMode): Game {
    return new Game(
      createGame(
        faces ?? this.s.cards.map((card) => card.face),
        Math.random() < 0.5 ? 'red' : 'blue',
        mode ?? this.s.mode,
      ),
    )
  }

  // A team's candidate mark — a private note toggled by right-click, allowed on
  // any turn so operatives can plan ahead while the opponent plays.
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
      // A normal clue grants count + 1 guesses; a 0 clue is "unlimited" — a big
      // finite number (not Infinity, which JSON.stringify would turn to null).
      guessesRemaining: count === 0 ? 99 : count + 1,
      clue: { team: this.s.turn, word, count },
      log: [...this.s.log, `${this.s.turn} clue: ${word} ${count}`],
    })
  }

  endTurn(): Game {
    if (this.s.winner) return this
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
        index === cardIndex ? { ...current, revealed: true } : current,
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

// Wipe a team's candidate marks when its turn ends (they've had their go),
// leaving the other team's forward marks intact so they survive the opponent's turn.
const clearMarks = (cards: Card[], team: Team): Card[] =>
  cards.map((card) =>
    card.markedBy.includes(team)
      ? { ...card, markedBy: card.markedBy.filter((t) => t !== team) }
      : card,
  )

const unrevealedCount = (state: GameState, team: Team): number =>
  state.cards.filter((card) => card.color === team && !card.revealed).length
