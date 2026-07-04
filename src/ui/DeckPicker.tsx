import type { CardProvider } from '../cardProviders/providers'
import styles from './DeckPicker.module.css'

// The grid of deck tiles, each a static icon + name (no fetching — previews would
// hammer the source APIs on every open). Shared by the homepage (where picking a
// deck creates a room) and the in-game "New game" overlay (where picking one
// re-deals the current room).
export default function DeckPicker(props: {
  providers: CardProvider[]
  onPick: (id: string) => void
}) {
  return (
    <ul className={styles.grid} role="list">
      {props.providers.map((provider) => (
        <li key={provider.id}>
          <button type="button" className={styles.tile} onClick={() => props.onPick(provider.id)}>
            <span className={styles.icon} aria-hidden="true">{provider.icon}</span>
            <span className={styles.label}>{provider.label}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
