import { useEffect, useRef, useState } from 'react'
import { UNLIMITED_CLUE, unlimitedClueHint, type Team } from '../classic/Game'
import styles from './ClueBar.module.css'

export function ClueBar(props: {
  game: {
    isVisible(word: string): boolean
    meansUnlimited(count: number): boolean
    maxClueCount(): number
    readonly state: { readonly turn: Team }
  }
  selectedCount: number
  onClue: (word: string, count: number) => void
}) {
  const [word, setWord] = useState('')
  const [count, setCount] = useState(1)
  const wordInput = useRef<HTMLInputElement>(null)
  const onTable = props.game.isVisible(word)
  useEffect(() => {
    if (props.selectedCount > 0) setCount(props.selectedCount)
    wordInput.current?.focus()
  }, [props.selectedCount])
  // Reuse the browser's own validation bubble (like the letters-only pattern) to
  // report a clue that repeats a word on the table.
  useEffect(() => {
    wordInput.current?.setCustomValidity(onTable ? 'That word is on the table' : '')
  }, [onTable])

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
        if (word.trim() && !onTable) {
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
