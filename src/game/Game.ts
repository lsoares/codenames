import { createGame, type BoardMode, type Card, type GameState, type Team } from './createGame'

// A wire message (guest → host, or a local dispatch). Stays a plain serializable
// object; the host routes it through Game.apply.
export type Action =
  | { type: 'clue'; word: string; count: number }
  | { type: 'guess'; cardIndex: number }
  | { type: 'toggleMark'; cardIndex: number; team: Team }
  | { type: 'endTurn' }
  | { type: 'newGame'; faces?: string[]; mode?: BoardMode }

const opponent = (team: Team): Team => (team === 'red' ? 'blue' : 'red')

// A team's candidate marks are its own planning note; wipe them when that team's
// turn ends (they've had their go), leaving the other team's forward marks intact
// so they survive across the opponent's turn.
const clearMarks = (cards: Card[], team: Team): Card[] =>
  cards.map((card) =>
    card.markedBy.includes(team)
      ? { ...card, markedBy: card.markedBy.filter((t) => t !== team) }
      : card,
  )

const unrevealedCount = (state: GameState, team: Team): number =>
  state.cards.filter((card) => card.color === team && !card.revealed).length

// The game as a domain object: ask it questions, or apply a domain action to get
// the next Game. The plain `GameState` (`.state`) stays the wire and persistence
// format — a Game is built only at the read/apply boundary and is never
// serialized or sent over the network.
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

  // The complement: a fresh deal or a finished game — safe to re-deal or switch
  // sides without a prompt. A positive name so call sites read `game.idle()`.
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

  apply(action: Action): Game {
    switch (action.type) {
      case 'clue':
        return this.giveClue(action.word, action.count)
      case 'guess':
        return this.guess(action.cardIndex)
      case 'toggleMark':
        return this.mark(action.cardIndex, action.team)
      case 'endTurn':
        return this.endTurn()
      case 'newGame':
        return this.newGame(action.faces, action.mode)
    }
  }
}
