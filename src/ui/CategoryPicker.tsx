import type { Deck } from '../decks'
import styles from './CategoryPicker.module.css'

export type CategoryFilter = Deck['category'] | null

export function CategoryPicker(props: {
  category: CategoryFilter
  onCategoryChange: (category: CategoryFilter) => void
  showMore: boolean
  onShowMoreChange: (showMore: boolean) => void
}) {
  const tab = (category: Deck['category']) => {
    const active = props.category === category
    return (
      <button
        key={category}
        type="button"
        aria-pressed={active}
        className={`${styles.chip}${active ? ` ${styles.active}` : ''}`}
        onClick={() => props.onCategoryChange(active ? null : category)}
      >
        {category[0].toUpperCase() + category.slice(1)}
      </button>
    )
  }

  return (
    <>
      <div className={styles.set} role="group" aria-label="Filter decks">
        {tab('words')}
        {tab('photos')}
        {tab('abstract')}
        {tab('symbols')}
        {tab('culture')}
      </div>
      <button
        type="button"
        aria-pressed={props.showMore}
        className={`${styles.toggle}${props.showMore ? ` ${styles.active}` : ''}`}
        title="Show advanced decks"
        onClick={() => props.onShowMoreChange(!props.showMore)}
      >
        More
      </button>
    </>
  )
}
