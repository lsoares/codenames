import type { BoardSize } from '../Game'
import styles from './BoardSizeSelector.module.css'

export default function BoardSizeSelector(props: {
  value: BoardSize
  onChange: (size: BoardSize) => void
}) {
  const option = (size: BoardSize) => {
    const active = props.value === size
    return (
      <button
        key={size}
        type="button"
        aria-pressed={active}
        title={`${size} board`}
        className={`${styles.option}${active ? ` ${styles.active}` : ''}`}
        onClick={() => props.onChange(size)}
      >
        {size}
      </button>
    )
  }

  return (
    <div className={styles.selector} role="radiogroup" aria-label="Board size">
      {option('5x4')}
      {option('5x5')}
    </div>
  )
}
