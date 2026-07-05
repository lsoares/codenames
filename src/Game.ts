export type Team = 'red' | 'blue'
export type CardColor = 'red' | 'blue' | 'neutral' | 'assassin'
export type GamePhase = 'clue' | 'guess'

export interface Credit {
  readonly label: string
  readonly url: string
}

// How an image face fills its card: plain cover, or cover with a hair of zoom to
// crop the scanned black frame off the official picture cards.
export type CardFit = 'cover' | 'framed'

// GameState (and everything it holds) is deeply readonly: a Game never mutates
// its state in place — every operation returns a new Game — and `game.state` is
// shared with the wire/persistence, so callers must treat it as immutable.
export interface Card {
  readonly face: string // an image URL or a word — the board renders whichever it is
  readonly color: CardColor
  readonly revealed: boolean
  readonly markedBy: readonly Team[] // operative candidate notes, private to each team
  readonly outcome: GuessOutcome | null // fixed when guessed, from the guesser's view
}

export interface Clue {
  readonly team: Team
  readonly word: string
  readonly count: number
}

export interface GameState {
  readonly cards: readonly Card[]
  readonly credit: Credit | null // attribution for the deck's source, null when local
  readonly fit: CardFit // how image faces fill their card
  readonly turn: Team
  readonly phase: GamePhase
  readonly clue: Clue | null
  readonly guessesRemaining: number
  readonly winner: Team | null
  readonly log: readonly string[]
}

export type GuessOutcome = 'correct' | 'wrong' | 'neutral' | 'assassin'

export type ActingRole = 'spymaster' | 'operatives'

// What changed between two consecutive games, so consumers react to events (a
// clue, a guess and its outcome, a turn passing, a win, a fresh deal) instead of
// diffing raw state themselves.
export interface Transition {
  newGame: boolean
  clueGiven: Clue | null
  guessed: { index: number; card: Card; outcome: GuessOutcome } | null
  turnPassed: { from: Team; to: Team } | null
  win: { team: Team; byAssassin: boolean } | null
}

export function createGame(
  faces: string[],
  startingTeam: Team,
  credit: Credit | null = null,
  fit: CardFit = 'cover',
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
    credit,
    fit,
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

  // Whose action the turn team is waiting on: the spymaster clues, then the
  // operatives guess.
  awaitingRole(): ActingRole {
    return this.s.phase === 'clue' ? 'spymaster' : 'operatives'
  }

  // A card's colour is visible once it's revealed, or to a spymaster.
  showsColor(cardIndex: number, isSpymaster: boolean): boolean {
    return this.s.cards[cardIndex].revealed || isSpymaster
  }

  // Whether a viewer may act on a card this turn: only the team on turn acts, and
  // only on live cards; a spymaster picks only their own colour, an operative any.
  canAct(cardIndex: number, viewer: { team: Team; isSpymaster: boolean }): boolean {
    const card = this.s.cards[cardIndex]
    if (card.revealed || this.s.turn !== viewer.team) return false
    return viewer.isSpymaster ? card.color === viewer.team : true
  }

  // Operatives mark unrevealed cards — a private note, allowed on any turn.
  canMark(cardIndex: number, isSpymaster: boolean): boolean {
    return !isSpymaster && !this.s.cards[cardIndex].revealed
  }

  // A fresh game: new faces when the caller fetched some, else reshuffle the
  // current ones (keeping the deck's credit). Allowed even after a win.
  newGame(faces?: string[], credit?: Credit | null, fit?: CardFit): Game {
    return new Game(
      createGame(
        faces ?? this.s.cards.map((card) => card.face),
        Math.random() < 0.5 ? 'red' : 'blue',
        credit === undefined ? this.s.credit : credit,
        fit ?? this.s.fit,
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

  // What happened between the previous game and this one.
  changesFrom(prev: Game): Transition {
    const before = prev.s
    const after = this.s
    // The log only ever grows within a game; a shorter one means a fresh deal.
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

// Wipe a team's candidate marks when its turn ends (they've had their go),
// leaving the other team's forward marks intact so they survive the opponent's turn.
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
