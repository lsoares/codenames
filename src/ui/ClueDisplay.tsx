import { unlimitedClueHint } from '../Game'
import styles from './ClueDisplay.module.css'

export function ClueDisplay(props: {
  word: string
  count: number
  guessesUsed: number
  guessesTotal: number
  unlimited?: boolean
}) {
  return (
    <span className={styles.clue}>
      <a
        className={styles.word}
        href={`https://en.wiktionary.org/wiki/${encodeURIComponent(props.word.toLowerCase())}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {props.word}
      </a>
      {props.unlimited ? (
        <span
          className={styles.unlimited}
          role="img"
          aria-label="unlimited guesses"
          title={unlimitedClueHint(props.count === 0)}
        >
          {props.count === 0 ? '0' : '∞'}
        </span>
      ) : (
        <span
          className={styles.pips}
          role="img"
          aria-label={`${props.guessesUsed} used out of ${props.guessesTotal}`}
          title={`${props.guessesUsed} used out of ${props.guessesTotal}`}
        >
          {Array.from({ length: props.guessesTotal }, (_, i) => (
            <span
              key={i}
              className={styles.pip}
              data-spent={i < props.guessesUsed || undefined}
            />
          ))}
        </span>
      )}
    </span>
  )
}
