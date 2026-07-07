import { useEffect, useState } from 'react'
import { INFINITE_CLUE, type Team } from '../Game'
import styles from './ClueBar.module.css'

// The spymaster's clue input, docked at the bottom centre while it's their turn.
export default function ClueBar(props: {
  turn: Team
  teamCardsLeft: number
  selectedCount: number
  onClue: (word: string, count: number) => void
}) {
  const [word, setWord] = useState('')
  // Default to a clue for one card. Once the spymaster starts picking cards the
  // number follows the selection, and the spinner stays freely editable either
  // way (e.g. clue fewer than picked, or 0 for unlimited).
  const [count, setCount] = useState(1)
  useEffect(() => {
    if (props.selectedCount > 0) setCount(props.selectedCount)
  }, [props.selectedCount])

  // The count steps 0, 1, …, cards-left, then ∞ (unlimited) — one past the max.
  const stepUp = (c: number) => (c === INFINITE_CLUE || c >= props.teamCardsLeft ? INFINITE_CLUE : c + 1)
  const stepDown = (c: number) => (c === INFINITE_CLUE ? props.teamCardsLeft : Math.max(0, c - 1))

  return (
    <form
      className={styles.clueForm}
      data-team={props.turn}
      onSubmit={(event) => {
        event.preventDefault()
        if (word.trim()) {
          props.onClue(word.trim(), count)
          setWord('')
        }
      }}
    >
      <input
        className={styles.word}
        autoFocus
        value={word}
        required
        pattern="\S+"
        maxLength={20}
        title="One word, no spaces"
        placeholder={props.turn === 'red' ? "Red's clue" : "Blue's clue"}
        onChange={(event) => setWord(event.target.value)}
        onKeyDown={(event) => {
          // Up/down from the word field steps the count too, so the spymaster can
          // set the number (including ∞) without leaving the clue box.
          if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
          event.preventDefault()
          setCount(event.key === 'ArrowUp' ? stepUp : stepDown)
        }}
      />
      {/* Number and submit stay paired, so on a narrow phone they wrap together
          onto the line below the (now full-width) clue word. */}
      <div className={styles.fields}>
        <div className={styles.stepper} data-team={props.turn}>
          <button type="button" className={styles.step} aria-label="Fewer" onClick={() => setCount(stepDown)}>
            −
          </button>
          <span
            className={styles.countValue}
            role="status"
            aria-label={`${count === INFINITE_CLUE ? 'unlimited' : count} guesses`}
          >
            {count === INFINITE_CLUE ? '∞' : count}
          </span>
          <button type="button" className={styles.step} aria-label="More" onClick={() => setCount(stepUp)}>
            +
          </button>
        </div>
        <button
          type="submit"
          className={styles.submit}
          aria-label="Give clue"
          title="Give clue"
          disabled={!word.trim()}
        >
          ✓
        </button>
      </div>
    </form>
  )
}
