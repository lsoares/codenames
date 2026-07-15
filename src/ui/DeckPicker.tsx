import { useState } from 'react'
import type { Deck } from '../decks'
import type { DeckFilter } from './DeckFilters'
import styles from './DeckPicker.module.css'

export default function DeckPicker(props: {
  decks: Deck[]
  filter: DeckFilter
  onPick: (id: string) => void
}) {
  const [pickedId, setPickedId] = useState<string | null>(null)
  const pick = (id: string) => {
    if (pickedId) return
    setPickedId(id)
    props.onPick(id)
  }

  const tile = (deck: Deck) => {
    const loading = pickedId === deck.id
    return (
      <li key={deck.id}>
        <button
          type="button"
          className={`${styles.tile}${pickedId && !loading ? ` ${styles.dimmed}` : ''}`}
          title={deck.description}
          disabled={pickedId !== null}
          onClick={() => pick(deck.id)}
        >
          {loading ? (
            <span
              className={styles.spinner}
              role="progressbar"
              aria-label={`Dealing ${deck.label}`}
            />
          ) : (
            <span className={styles.icon} aria-hidden="true">
              {deck.icon}
            </span>
          )}
          <span className={styles.label}>{deck.label}</span>
        </button>
      </li>
    )
  }

  const matches = (deck: Deck) =>
    (!props.filter.group || deck.group === props.filter.group) &&
    (!props.filter.difficulty || deck.difficulty === props.filter.difficulty)
  const ordered = GROUP_ORDER.flatMap((group) =>
    props.decks.filter((deck) => deck.group === group && matches(deck)),
  )
  if (ordered.length === 0) {
    return <p className={styles.empty}>No decks match. Pick another filter.</p>
  }
  return (
    <ul className={styles.grid} role="list" aria-label="Decks">
      {ordered.map(tile)}
    </ul>
  )
}

const GROUP_ORDER: Deck['group'][] = ['words', 'abstract', 'photos', 'symbols', 'culture']
