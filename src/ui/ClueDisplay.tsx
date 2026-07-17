import styles from './ClueDisplay.module.css'

export function ClueDisplay(props: {
  word: string
  count: number
  guessesUsed: number
  guessesTotal: number
  unlimited?: boolean
  bonusAt?: number
}) {
  return (
    <span className={styles.clue}>
      <strong className={styles.word}>{props.word}</strong>
      {props.unlimited ? (
        <span className={styles.unlimited} role="img" aria-label="unlimited guesses">
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
              data-bonus={props.bonusAt !== undefined && i === props.bonusAt || undefined}
            />
          ))}
        </span>
      )}
    </span>
  )
}
