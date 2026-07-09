import { useEffect, useState } from 'react'
import { INFINITE_CLUE, type Team } from '../Game'
import styles from './ClueBar.module.css'

export default function ClueBar(props: {
  turn: Team
  teamCardsLeft: number
  selectedCount: number
  onClue: (word: string, count: number) => void
}) {
  const [word, setWord] = useState('')
  const [count, setCount] = useState(1)
  useEffect(() => {
    if (props.selectedCount > 0) setCount(props.selectedCount)
  }, [props.selectedCount])

  const unlimited = count > props.teamCardsLeft
  const stepUp = (c: number) => Math.min(c + 1, props.teamCardsLeft + 1)
  const stepDown = (c: number) => Math.max(0, c - 1)

  return (
    <form
      className={styles.clueForm}
      data-team={props.turn}
      onSubmit={(event) => {
        event.preventDefault()
        if (word.trim()) {
          props.onClue(word.trim(), unlimited ? INFINITE_CLUE : count)
          setWord('')
        }
      }}
    >
      <input
        className={styles.word}
        autoFocus
        value={word}
        required
        pattern="\s*[\p{L}\p{M}]+\s*"
        maxLength={20}
        title="One word — letters only, no symbols"
        placeholder={props.turn === 'red' ? "Red's clue" : "Blue's clue"}
        onChange={(event) => setWord(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
          event.preventDefault()
          setCount(event.key === 'ArrowUp' ? stepUp : stepDown)
        }}
      />
      <div className={styles.fields}>
        <div className={styles.count} data-unlimited={unlimited || undefined} data-zero={count === 0 || undefined}>
          <input
            className={styles.countInput}
            type="number"
            min={0}
            max={props.teamCardsLeft + 1}
            value={count}
            aria-label={unlimited ? 'unlimited guesses' : 'number of guesses'}
            onChange={(event) =>
              setCount(
                Number.isNaN(event.target.valueAsNumber)
                  ? 0
                  : Math.max(0, Math.min(event.target.valueAsNumber, props.teamCardsLeft + 1)),
              )
            }
          />
          {unlimited && (
            <span className={styles.infinityOverlay} aria-hidden="true">
              ∞
            </span>
          )}
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
