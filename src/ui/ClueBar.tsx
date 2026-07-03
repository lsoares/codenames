import { useState } from 'react'
import type { GameState, Team } from '../game/createGame'
import styles from './ClueBar.module.css'

export default function ClueBar(props: {
  state: GameState
  mySeat: Team | null
  onClue: (word: string, count: number) => void
  onEndTurn: () => void
}) {
  const [word, setWord] = useState('')
  const [count, setCount] = useState(1)
  const turn = props.state.turn
  // Only the team-on-turn's spymaster clues; the other spymaster just waits.
  const activeSpymaster = props.mySeat === turn
  const teamCardsLeft = props.state.cards.filter(
    (card) => card.color === turn && !card.revealed,
  ).length

  return (
    <div className={styles.bar}>
      {props.state.phase === 'clue' ? (
        activeSpymaster ? (
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
        ) : (
          <span className={styles.waiting} data-team={turn}>
            Waiting for the spymaster's clue…
          </span>
        )
      ) : (
        <div className={styles.guessing}>
          <span className={styles.cluePill} data-team={turn}>
            <strong className={styles.clueWord}>{props.state.clue?.word}</strong>
            <span className={styles.clueDot}>•</span>
            <span className={styles.clueValue}>{props.state.clue?.count}</span>
          </span>
          {props.mySeat === null && (
            <button
              className={`secondary ${styles.pass}`}
              onClick={props.onEndTurn}
              aria-label="Pass"
              title="Pass"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  )
}
