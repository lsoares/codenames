import type { Card } from '../game/createGame'
import styles from './Board.module.css'

export default function Board(props: {
  cards: Card[]
  spymaster: boolean
  onCardClick: (index: number) => void
  onCardMark: (index: number) => void
}) {
  return (
    <div className={styles.board}>
      {props.cards.map((card, index) => {
        const showColor = card.revealed || props.spymaster
        const label = showColor ? `Card ${index + 1}, ${card.color}` : `Card ${index + 1}`
        return (
          <button
            key={index}
            className={styles.card}
            aria-label={label}
            data-color={showColor ? card.color : undefined}
            data-revealed={card.revealed || undefined}
            disabled={card.revealed}
            onClick={() => props.onCardClick(index)}
            onContextMenu={(event) => {
              event.preventDefault()
              props.onCardMark(index)
            }}
          >
            <img className={styles.image} src={card.imageUrl} alt="" />
            {showColor && card.color === 'assassin' && (
              <span className={styles.assassin} aria-hidden="true">
                ☠️
              </span>
            )}
            {card.marked && !card.revealed && (
              <span className={styles.mark} aria-hidden="true">
                📌
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
