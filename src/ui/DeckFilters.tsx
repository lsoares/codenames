import type { Deck } from '../decks'
import styles from './DeckFilters.module.css'

export interface DeckFilter {
  group: Deck['group'] | null
}

export default function DeckFilters(props: {
  value: DeckFilter
  onChange: (filter: DeckFilter) => void
}) {
  const category = (group: Deck['group']) => {
    const active = props.value.group === group
    return (
      <button
        key={group}
        type="button"
        aria-pressed={active}
        className={`${styles.chip}${active ? ` ${styles.active}` : ''}`}
        onClick={() => props.onChange({ ...props.value, group: active ? null : group })}
      >
        {group[0].toUpperCase() + group.slice(1)}
      </button>
    )
  }

  return (
    <div className={styles.set} role="group" aria-label="Filter decks">
      {category('words')}
      {category('photos')}
      {category('abstract')}
      {category('symbols')}
      {category('culture')}
    </div>
  )
}
