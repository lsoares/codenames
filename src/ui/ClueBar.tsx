import { useState } from 'react'
import type { GameState } from '../game/createGame'
import styles from './ClueBar.module.css'

export default function ClueBar(props: {
  state: GameState
  spymaster: boolean
  onClue: (word: string, count: number) => void
  onEndTurn: () => void
}) {
  const [word, setWord] = useState('')
  const [count, setCount] = useState(1)
  const turn = props.state.turn
  const teamCardsLeft = props.state.cards.filter(
    (card) => card.color === turn && !card.revealed,
  ).length

  return (
    <div className={styles.bar}>
      {props.state.phase === 'clue' ? (
        props.spymaster ? (
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
            <button type="submit">💡</button>
          </form>
        ) : (
          <span className={styles.waiting}>Waiting for the spymaster's clue…</span>
        )
      ) : (
        <div className={styles.guessing}>
          <span className={styles.cluePill} data-team={turn}>
            Clue: <strong>{props.state.clue?.word}</strong> ·{' '}
            {props.state.guessesRemaining} guesses left
          </span>
          {!props.spymaster && (
            <button className="secondary" onClick={props.onEndTurn}>
              End turn
            </button>
          )}
        </div>
      )}
    </div>
  )
}
