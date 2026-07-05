import type { CSSProperties } from 'react'
import { Game, type Card, type GuessOutcome, type Team } from '../Game'
import styles from './Board.module.css'

const feedbackBadge: Record<GuessOutcome, { emoji: string; label: string }> = {
  correct: { emoji: '🎯', label: 'correct guess' },
  wrong: { emoji: '❌', label: 'wrong guess' },
  neutral: { emoji: '🤷', label: 'neutral card' },
  assassin: { emoji: '💀', label: 'assassin' },
}

const isImageFace = (face: string): boolean => /^https?:\/\//.test(face)
const isSingleGlyph = (face: string): boolean =>
  Array.from(face).filter((ch) => ch.codePointAt(0) !== 0xfe0f).length === 1

export default function Board(props: {
  game: Game
  loading: boolean
  spymasterTeam: Team | null
  myTeam: Team
  selected: Set<number>
  feedback: Record<number, GuessOutcome>
  onToggleSelect: (index: number) => void
  onCardClick: (index: number) => void
  onCardMark: (index: number) => void
}) {
  const isSpymaster = props.spymasterTeam !== null
  const cards = props.game.state.cards
  const gameOver = props.game.state.winner !== null

  // Both roles single out cards the same way — a thicker border with the rest of
  // the board dimmed. A spymaster's picks are private (the selected set, owned by
  // GameScreen so the clue's proposed number can follow it); an operative sees
  // their own team's shared marks (`card.markedBy`, toggled by right-click).
  const highlighted = (card: Card, index: number): boolean =>
    !card.revealed &&
    (isSpymaster ? props.selected.has(index) : card.markedBy.includes(props.myTeam))
  const focusing = isSpymaster && cards.some((card, index) => highlighted(card, index))
  return (
    <div className={styles.board} data-focus={focusing || undefined} data-over={gameOver || undefined}>
      {cards.map((card, index) => {
        const showColor = props.game.showsColor(index, isSpymaster)
        // Word/emoji cards are named by their face; picture cards by position.
        const name = isImageFace(card.face) ? `Card ${index + 1}` : card.face
        // Announce an operative's own-team mark so it's perceivable without sight.
        const marked = !isSpymaster && highlighted(card, index)
        const label = showColor ? `${name}, ${card.color}` : marked ? `${name}, marked` : name
        const actionable = props.game.canAct(index, { team: props.myTeam, isSpymaster })
        const badge = gameOver && card.revealed ? card.outcome : props.feedback[index]
        const canMark = props.game.canMark(index, isSpymaster)
        return (
          <div key={index} className={styles.cell}>
            <button
              className={styles.card}
              aria-label={label}
              data-color={showColor ? card.color : undefined}
              data-mine={
                (isSpymaster && !card.revealed && card.color === props.spymasterTeam) ||
                undefined
              }
              data-revealed={card.revealed || undefined}
              data-feedback={props.feedback[index] || undefined}
              data-selected={(isSpymaster && highlighted(card, index)) || undefined}
              data-inert={!actionable || undefined}
              disabled={card.revealed}
              onClick={() => {
                if (!actionable) return
                if (isSpymaster) props.onToggleSelect(index)
                else props.onCardClick(index)
              }}
            >
              {props.loading ? (
                <span className={`${styles.face} ${styles.loading}`} />
              ) : card.face.endsWith('.svg') ? (
                <span
                  className={`${styles.face} ${styles.svgIcon}`}
                  style={{ ['--mask']: `url("${card.face}")` } as CSSProperties}
                />
              ) : isImageFace(card.face) ? (
                <img
                  className={`${styles.face} ${styles.image} ${
                    props.game.state.fit === 'framed'
                      ? styles.framed
                      : props.game.state.fit === 'contain'
                        ? styles.contain
                        : ''
                  }`}
                  src={card.face}
                  alt=""
                  draggable={false}
                />
              ) : (
                <span
                  className={`${styles.face} ${styles.word} ${
                    isSingleGlyph(card.face) ? styles.big : ''
                  }`}
                >
                  {card.face}
                </span>
              )}
              {badge && (
                <span className={styles.feedback} role="img" aria-label={feedbackBadge[badge].label}>
                  {feedbackBadge[badge].emoji}
                </span>
              )}
            </button>
            {canMark && (
              <button
                type="button"
                className={styles.overlayIcon}
                data-on={marked || undefined}
                aria-label={`${marked ? 'Unmark' : 'Mark'} ${name}`}
                title={`${marked ? 'Unmark' : 'Mark'} ${name}`}
                onClick={() => props.onCardMark(index)}
              >
                📌
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
