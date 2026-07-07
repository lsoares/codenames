import { useState } from 'react'
import type { CardProvider } from '../cardProviders/providers'
import styles from './DeckPicker.module.css'

// The deck tiles in three tiers: two hero decks, four headline, then the rest
// smaller — largest at the top, shrinking down.
export default function DeckPicker(props: {
  providers: CardProvider[]
  onPick: (id: string) => void
}) {
  const [pickedId, setPickedId] = useState<string | null>(null)
  const pick = (id: string) => {
    if (pickedId) return
    setPickedId(id)
    props.onPick(id)
  }

  const tile = (provider: CardProvider, className: string) => {
    const loading = pickedId === provider.id
    return (
      <li key={provider.id}>
        <button
          type="button"
          className={`${className}${pickedId && !loading ? ` ${styles.dimmed}` : ''}`}
          title={provider.description}
          disabled={pickedId !== null}
          onClick={() => pick(provider.id)}
        >
          {loading ? (
            <span className={styles.spinner} role="progressbar" aria-label={`Dealing ${provider.label}`} />
          ) : (
            <span className={styles.icon} aria-hidden="true">{provider.icon}</span>
          )}
          <span className={styles.label}>{provider.label}</span>
        </button>
      </li>
    )
  }

  return (
    <div className={styles.decks}>
      <ul className={styles.gridBig} role="list">
        {props.providers.slice(0, 2).map((provider) => tile(provider, styles.big))}
      </ul>
      <ul className={styles.grid} role="list">
        {props.providers.slice(2, 6).map((provider) => tile(provider, styles.tile))}
      </ul>
      {props.providers.length > 6 && (
        <ul className={styles.gridSmall} role="list">
          {props.providers.slice(6).map((provider) => tile(provider, styles.small))}
        </ul>
      )}
    </div>
  )
}
