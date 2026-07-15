import { useEffect, useRef, useState } from 'react'
import { UNLIMITED_CLUE, unlimitedClueHint, type Game } from '../Game'
import styles from './ClueBar.module.css'

export default function ClueBar(props: {
  game: Game
  selectedCount: number
  onClue: (word: string, count: number) => void
}) {
  const [word, setWord] = useState('')
  const [count, setCount] = useState(1)
  const wordInput = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (props.selectedCount > 0) setCount(props.selectedCount)
    wordInput.current?.focus()
  }, [props.selectedCount])

  const turn = props.game.state.turn
  const unlimited = props.game.meansUnlimited(count)
  const stepUp = (c: number) => Math.min(c + 1, props.game.maxClueCount())
  const stepDown = (c: number) => Math.max(0, c - 1)

  return (
    <form
      className={styles.clueForm}
      data-team={turn}
      onSubmit={(event) => {
        event.preventDefault()
        if (word.trim()) {
          props.onClue(word.trim(), unlimited ? UNLIMITED_CLUE : count)
          setWord('')
        }
      }}
    >
      <div className={styles.combo}>
        <input
          ref={wordInput}
          className={styles.word}
          autoFocus
          value={word}
          required
          pattern="\s*[\p{L}\p{M}]+\s*"
          maxLength={20}
          title="One word — letters only, no symbols"
          placeholder={turn === 'red' ? "Red's clue" : "Blue's clue"}
          onChange={(event) => {
            // A clue is letters only, so a typed digit means the count — route it
            // to the number field and keep it out of the word, saving a tab.
            const raw = event.target.value
            const digits = raw.replace(/\D/g, '')
            setWord(raw.replace(/\d/g, ''))
            if (digits) setCount(Math.max(0, Math.min(Number(digits), props.game.maxClueCount())))
          }}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
            event.preventDefault()
            setCount(event.key === 'ArrowUp' ? stepUp : stepDown)
          }}
        />
        <div
          className={styles.count}
          data-unlimited={unlimited || undefined}
          data-zero={count === 0 || undefined}
          title={
            count === 0
              ? unlimitedClueHint(true)
              : unlimited
                ? unlimitedClueHint(false)
                : `Your team may guess up to ${count + 1} cards: the clue number plus one bonus.`
          }
        >
          <input
            className={styles.countInput}
            type="number"
            min={0}
            max={props.game.maxClueCount()}
            value={count}
            aria-label={unlimited ? 'unlimited guesses' : 'number of guesses'}
            onChange={(event) =>
              setCount(
                Number.isNaN(event.target.valueAsNumber)
                  ? 0
                  : Math.max(0, Math.min(event.target.valueAsNumber, props.game.maxClueCount())),
              )
            }
          />
          {unlimited && (
            <span className={styles.unlimitedOverlay} aria-hidden="true">
              ∞
            </span>
          )}
        </div>
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
    </form>
  )
}
