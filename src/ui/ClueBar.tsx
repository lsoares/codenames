import { useEffect, useState } from 'react'
import type { Team } from '../Game'
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
      <div className={styles.fields}>
        <input
          value={word}
          required
          pattern="\S+"
          title="One word, no spaces"
          placeholder={props.turn === 'red' ? "Red's clue" : "Blue's clue"}
          onChange={(event) => setWord(event.target.value)}
        />
        <input
          id="clue-count"
          type="number"
          min={0}
          max={props.teamCardsLeft}
          placeholder="Number"
          value={count}
          onChange={(event) => setCount(event.target.valueAsNumber)}
        />
      </div>
      <button
        type="submit"
        className={styles.submit}
        aria-label="Give clue"
        title="Give clue"
        disabled={!word.trim() || Number.isNaN(count)}
      >
        ✓
      </button>
    </form>
  )
}
