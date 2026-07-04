import type { BoardMode, Card, Team } from '../Game'
import styles from './Board.module.css'

// The outcome of a guess, from the guessing team's point of view — shown as a
// brief emoji flashed over the card the moment it's revealed (see GameScreen).
export type GuessOutcome = 'correct' | 'wrong' | 'neutral' | 'assassin'

const feedbackBadge: Record<GuessOutcome, { emoji: string; label: string }> = {
  correct: { emoji: '🎯', label: 'correct guess' },
  wrong: { emoji: '❌', label: 'wrong guess' },
  neutral: { emoji: '🤷', label: 'neutral card' },
  assassin: { emoji: '💀', label: 'assassin' },
}

export default function Board(props: {
  cards: Card[]
  mode: BoardMode
  loading: boolean
  spymasterTeam: Team | null
  myTeam: Team
  turn: Team
  selected: Set<number>
  feedback: Record<number, GuessOutcome>
  onToggleSelect: (index: number) => void
  onCardClick: (index: number) => void
  onCardMark: (index: number) => void
}) {
  const isSpymaster = props.spymasterTeam !== null

  // Both roles single out cards the same way — a thicker border with the rest of
  // the board dimmed. A spymaster's picks are private (the selected set, owned by
  // GameScreen so the clue's proposed number can follow it); an operative sees
  // their own team's shared marks (`card.markedBy`, toggled by right-click).
  const highlighted = (card: Card, index: number): boolean =>
    !card.revealed &&
    (isSpymaster ? props.selected.has(index) : card.markedBy.includes(props.myTeam))
  const focusing = props.cards.some((card, index) => highlighted(card, index))
  return (
    <div className={styles.board} data-focus={focusing || undefined}>
      {props.cards.map((card, index) => {
        const showColor = card.revealed || isSpymaster
        // Word cards are named by their word; picture cards by position.
        const name = props.mode === 'word' ? card.face : `Card ${index + 1}`
        // Announce an operative's own-team mark so it's perceivable without sight.
        const marked = !isSpymaster && highlighted(card, index)
        const label = showColor ? `${name}, ${card.color}` : marked ? `${name}, marked` : name
        // Only the team on turn acts, and only on live cards: an operative
        // guesses any unrevealed card; a spymaster only marks their own.
        const actionable =
          !card.revealed &&
          props.turn === props.myTeam &&
          (isSpymaster ? card.color === props.spymasterTeam : true)
        return (
          <button
            key={index}
            className={styles.card}
            aria-label={label}
            data-color={showColor ? card.color : undefined}
            data-mine={
              (isSpymaster && !card.revealed && card.color === props.spymasterTeam) ||
              undefined
            }
            data-revealed={card.revealed || undefined}
            data-feedback={props.feedback[index] || undefined}
            data-selected={highlighted(card, index) || undefined}
            data-inert={!actionable || undefined}
            disabled={card.revealed}
            onClick={() => {
              if (!actionable) return
              if (isSpymaster) props.onToggleSelect(index)
              else props.onCardClick(index)
            }}
            onContextMenu={(event) => {
              event.preventDefault()
              // Operatives mark on any turn — a private note to plan ahead while
              // the opponent plays — so this isn't gated by `actionable`.
              if (!isSpymaster && !card.revealed) props.onCardMark(index)
            }}
          >
            {props.loading ? (
              <span className={`${styles.face} ${styles.loading}`} />
            ) : props.mode === 'word' ? (
              <span className={`${styles.face} ${styles.word}`}>{card.face}</span>
            ) : (
              <img
                className={`${styles.face} ${styles.image}`}
                src={card.face}
                alt=""
                draggable={false}
              />
            )}
            {props.feedback[index] && (
              <span
                className={styles.feedback}
                role="img"
                aria-label={feedbackBadge[props.feedback[index]].label}
              >
                {feedbackBadge[props.feedback[index]].emoji}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
