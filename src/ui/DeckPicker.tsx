import { useState } from 'react'
import type { CardProvider } from '../cardProviders/providers'
import styles from './DeckPicker.module.css'

// The grid of deck tiles, each a static icon + name (no fetching — previews would
// hammer the source APIs on every open). Shared by the homepage (where picking a
// deck creates a room) and the in-game "New game" overlay (where picking one
// re-deals the current room). Quirkier `extra` decks stay hidden behind a
// one-way "more" tile so the picker opens uncluttered; once revealed they stay.
export default function DeckPicker(props: {
  providers: CardProvider[]
  onPick: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const shown = props.providers.filter((provider) => expanded || !provider.extra)
  const hiddenCount = props.providers.length - shown.length

  return (
    <ul className={styles.grid} role="list">
      {shown.map((provider) => (
        <li key={provider.id}>
          <button type="button" className={styles.tile} onClick={() => props.onPick(provider.id)}>
            <span className={styles.icon} aria-hidden="true">{provider.icon}</span>
            <span className={styles.label}>{provider.label}</span>
          </button>
        </li>
      ))}
      {hiddenCount > 0 && (
        <li>
          <button
            type="button"
            className={styles.more}
            aria-label={`Show ${hiddenCount} more decks`}
            onClick={() => setExpanded(true)}
          >
            <span className={styles.plus} aria-hidden="true">+</span>
          </button>
        </li>
      )}
    </ul>
  )
}
