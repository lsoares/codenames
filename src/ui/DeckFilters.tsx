import type { Deck } from '../cardProviders/providers'
import styles from './DeckFilters.module.css'

export interface DeckFilter {
  group: Deck['group'] | null
  difficulty: Deck['difficulty'] | null
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

  const difficulty = (level: Deck['difficulty']) => {
    const active = props.value.difficulty === level
    return (
      <button
        key={level}
        type="button"
        aria-pressed={active}
        className={`${styles.chip}${active ? ` ${styles.active}` : ''}`}
        onClick={() => props.onChange({ ...props.value, difficulty: active ? null : level })}
      >
        {level[0].toUpperCase() + level.slice(1)}
      </button>
    )
  }

  return (
    <div className={styles.chips} role="group" aria-label="Filter decks">
      <div className={styles.set}>
        {category('words')}
        {category('photos')}
        {category('abstract')}
        {category('symbols')}
        {category('culture')}
      </div>
      <div className={styles.set}>
        {difficulty('casual')}
        {difficulty('tough')}
        {difficulty('brutal')}
      </div>
    </div>
  )
}
