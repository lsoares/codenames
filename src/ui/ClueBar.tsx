import { useState } from 'react'
import type { GameState } from '../game/createGame'
import styles from './ClueBar.module.css'

export default function ClueBar(props: {
  state: GameState
  onClue: (word: string, count: number) => void
  onEndTurn: () => void
}) {
  const [word, setWord] = useState('')
  const [count, setCount] = useState(1)
  const turn = props.state.turn

  return (
    <div className={styles.bar}>
      <h2 className={styles.turn} data-team={turn}>
        {turn === 'red' ? "Red's turn" : "Blue's turn"}
      </h2>

      {props.state.phase === 'clue' ? (
        <form
          className={styles.clueForm}
          onSubmit={(event) => {
            event.preventDefault()
            if (word.trim()) {
              props.onClue(word.trim(), count)
              setWord('')
            }
          }}
        >
          <label htmlFor="clue-word">Clue</label>
          <input id="clue-word" value={word} onChange={(event) => setWord(event.target.value)} />
          <label htmlFor="clue-count">Number</label>
          <input
            id="clue-count"
            type="number"
            min={0}
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
          />
          <button type="submit">Give clue</button>
        </form>
      ) : (
        <div className={styles.guessing}>
          <span>
            Clue: <strong>{props.state.clue?.word}</strong> ·{' '}
            {props.state.guessesRemaining} guesses left
          </span>
          <button className="secondary" onClick={props.onEndTurn}>
            End turn
          </button>
        </div>
      )}
    </div>
  )
}
