import { useState } from 'react'
import type { GameState, Team } from '../game/createGame'
import styles from './ClueBar.module.css'

export default function ClueBar(props: {
  state: GameState
  mySeat: Team | null
  myTeam: Team
  onClue: (word: string, count: number) => void
  onEndTurn: () => void
}) {
  const [word, setWord] = useState('')
  const [count, setCount] = useState(1)
  const { turn, phase, clue } = props.state
  const activeSpymaster = props.mySeat === turn
  const mine = turn === props.myTeam
  const teamCardsLeft = props.state.cards.filter(
    (card) => card.color === turn && !card.revealed,
  ).length

  // My team's clue to give → the form; everyone else sees a status pill.
  if (phase === 'clue' && activeSpymaster) {
    return (
      <div className={styles.bar}>
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
      </div>
    )
  }

  const status =
    phase === 'clue'
      ? mine
        ? `Your spymaster's turn (${turn})`
        : `The other team (${turn}) is playing`
      : mine
        ? props.mySeat
          ? `Your operatives' turn (${turn})`
          : `Your turn (${turn})`
        : `The other team (${turn}) is playing`

  return (
    <div className={styles.bar}>
      <span className={styles.cluePill} data-team={turn}>
        {phase === 'guess' && clue && (
          <>
            <strong className={styles.clueWord}>{clue.word}</strong>
            <span className={styles.clueDot}>•</span>
            <span className={styles.clueValue}>{clue.count}</span>
          </>
        )}
        <span className={styles.statusText}>{status}</span>
      </span>
      {phase === 'guess' && mine && props.mySeat === null && (
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
  )
}
