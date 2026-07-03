import { useEffect, useState } from 'react'
import type { BoardMode, Card, Team } from '../game/createGame'
import styles from './Board.module.css'

export default function Board(props: {
  cards: Card[]
  mode: BoardMode
  spymasterTeam: Team | null
  onCardClick: (index: number) => void
  onCardMark: (index: number) => void
}) {
  const isSpymaster = props.spymasterTeam !== null

  // A spymaster can't guess, so their left-click instead enlarges a card — a
  // private, local-only way to single out candidates while thinking. Cleared
  // when a new game starts.
  const [enlarged, setEnlarged] = useState<Set<number>>(new Set())
  const freshBoard = props.cards.every((card) => !card.revealed)
  useEffect(() => {
    if (freshBoard) setEnlarged(new Set())
  }, [freshBoard])

  const toggleEnlarge = (index: number) =>
    setEnlarged((prev) => {
      const next = new Set(prev)
      next.has(index) ? next.delete(index) : next.add(index)
      return next
    })

  const focusing = isSpymaster && enlarged.size > 0
  return (
    <div className={styles.board} data-focus={focusing || undefined}>
      {props.cards.map((card, index) => {
        const showColor = card.revealed || isSpymaster
        // Word cards are named by their word; picture cards by position.
        const name = props.mode === 'word' ? card.face : `Card ${index + 1}`
        const label = showColor ? `${name}, ${card.color}` : name
        // Only live cards act on click: an operative guesses any unrevealed card;
        // a spymaster only marks their own. Faded/revealed cards are inert.
        const actionable =
          !card.revealed && (isSpymaster ? card.color === props.spymasterTeam : true)
        return (
          <button
            key={index}
            className={styles.card}
            aria-label={label}
            data-color={showColor ? card.color : undefined}
            data-revealed={card.revealed || undefined}
            data-enlarged={(isSpymaster && enlarged.has(index)) || undefined}
            data-inert={!actionable || undefined}
            disabled={card.revealed}
            onClick={() => {
              if (!actionable) return
              if (isSpymaster) toggleEnlarge(index)
              else props.onCardClick(index)
            }}
            onContextMenu={(event) => {
              event.preventDefault()
              if (!isSpymaster && !card.revealed) props.onCardMark(index)
            }}
          >
            {props.mode === 'word' ? (
              <span className={`${styles.face} ${styles.word}`}>{card.face}</span>
            ) : (
              <img className={`${styles.face} ${styles.image}`} src={card.face} alt="" />
            )}
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
