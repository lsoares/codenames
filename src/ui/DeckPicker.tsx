import { useState } from 'react'
import type { CardProvider } from '../cardProviders/providers'
import styles from './DeckPicker.module.css'

// The deck tiles in three tiers: two hero decks, four headline, then the rest
// smaller — largest at the top, shrinking down.
export default function DeckPicker(props: {
  providers: CardProvider[]
  onPick: (id: string) => void
}) {
  const [picked, setPicked] = useState(false)
  const pick = (id: string) => {
    if (picked) return
    setPicked(true)
    props.onPick(id)
  }

  const tile = (provider: CardProvider, className: string) => (
    <li key={provider.id}>
      <button
        type="button"
        className={className}
        title={provider.description}
        disabled={picked}
        onClick={() => pick(provider.id)}
      >
        <span className={styles.icon} aria-hidden="true">{provider.icon}</span>
        <span className={styles.label}>{provider.label}</span>
      </button>
    </li>
  )

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
