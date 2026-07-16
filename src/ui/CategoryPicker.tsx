import type { Deck } from '../decks'
import styles from './CategoryPicker.module.css'

export function CategoryPicker(props: {
  category?: Deck['category']
  onCategoryChange: (category?: Deck['category']) => void
}) {
  const tab = (category: Deck['category']) => {
    const active = props.category === category
    return (
      <button
        key={category}
        type="button"
        aria-pressed={active}
        className={`${styles.chip}${active ? ` ${styles.active}` : ''}`}
        onClick={() => props.onCategoryChange(active ? undefined : category)}
      >
        {category[0].toUpperCase() + category.slice(1)}
      </button>
    )
  }

  return (
    <div className={styles.set} role="group" aria-label="Filter decks">
      {tab('words')}
      {tab('photos')}
      {tab('abstract')}
      {tab('symbols')}
      {tab('culture')}
    </div>
  )
}
