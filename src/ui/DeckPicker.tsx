import { useState } from 'react'
import type { Deck } from '../decks'
import styles from './DeckPicker.module.css'

export function DeckPicker(props: {
  decks: Deck[]
  category?: Deck['category']
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
          title={`${deck.description} ${DIFFICULTY_PIPS[deck.difficulty]}`}
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
    (!props.category || deck.category === props.category) &&
    (props.category !== null || deck.difficulty === 'casual')
  const ordered = CATEGORY_ORDER.flatMap((category) =>
    props.decks
      .filter((deck) => deck.category === category && matches(deck))
      .sort((a, b) => DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty]),
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

const CATEGORY_ORDER: Deck['category'][] = ['words', 'abstract', 'photos', 'symbols', 'culture']

const DIFFICULTY_RANK: Record<Deck['difficulty'], number> = { casual: 0, tough: 1, brutal: 2 }

const DIFFICULTY_PIPS: Record<Deck['difficulty'], string> = {
  casual: '\u2605',
  tough: '\u2605\u2605',
  brutal: '\u2605\u2605\u2605',
}
