import type { BoardMode, Card, Team } from '../game/createGame'
import styles from './Board.module.css'

export default function Board(props: {
  cards: Card[]
  mode: BoardMode
  spymasterTeam: Team | null
  myTeam: Team
  turn: Team
  enlarged: Set<number>
  onToggleEnlarge: (index: number) => void
  onCardClick: (index: number) => void
  onCardMark: (index: number) => void
}) {
  const isSpymaster = props.spymasterTeam !== null

  // Both roles single out cards the same way — a thicker border with the rest of
  // the board dimmed. A spymaster's picks are private (the enlarged set, owned by
  // GameScreen so the clue's proposed number can follow it); the operatives' are
  // a shared team note (`card.marked`, toggled by right-click).
  const highlighted = (card: Card, index: number): boolean =>
    !card.revealed && (isSpymaster ? props.enlarged.has(index) : card.marked)
  const focusing = props.cards.some((card, index) => highlighted(card, index))
  return (
    <div className={styles.board} data-focus={focusing || undefined}>
      {props.cards.map((card, index) => {
        const showColor = card.revealed || isSpymaster
        // Word cards are named by their word; picture cards by position.
        const name = props.mode === 'word' ? card.face : `Card ${index + 1}`
        const label = showColor ? `${name}, ${card.color}` : name
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
            data-revealed={card.revealed || undefined}
            data-enlarged={highlighted(card, index) || undefined}
            data-inert={!actionable || undefined}
            disabled={card.revealed}
            onClick={() => {
              if (!actionable) return
              if (isSpymaster) props.onToggleEnlarge(index)
              else props.onCardClick(index)
            }}
            onContextMenu={(event) => {
              event.preventDefault()
              if (!isSpymaster && actionable) props.onCardMark(index)
            }}
          >
            {props.mode === 'word' ? (
              <span className={`${styles.face} ${styles.word}`}>{card.face}</span>
            ) : (
              <img className={`${styles.face} ${styles.image}`} src={card.face} alt="" />
            )}
          </button>
        )
      })}
    </div>
  )
}
