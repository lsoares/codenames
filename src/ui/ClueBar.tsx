import { useState } from 'react'
import type { GameState } from '../game/createGame'
import styles from './ClueBar.module.css'

// The spymaster's clue input, docked at the bottom centre while it's their turn.
export default function ClueBar(props: {
  state: GameState
  onClue: (word: string, count: number) => void
}) {
  const [word, setWord] = useState('')
  const [count, setCount] = useState(1)
  const turn = props.state.turn
  const teamCardsLeft = props.state.cards.filter(
    (card) => card.color === turn && !card.revealed,
  ).length

  return (
    <form
      className={styles.clueForm}
      data-team={turn}
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
          placeholder={turn === 'red' ? "Red's clue" : "Blue's clue"}
          onChange={(event) => setWord(event.target.value)}
        />
        <input
          id="clue-count"
          type="number"
          min={0}
          max={teamCardsLeft}
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
