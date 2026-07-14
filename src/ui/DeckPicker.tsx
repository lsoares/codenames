import { useState } from 'react'
import type { CardProvider, DeckGroup } from '../cardProviders/providers'
import styles from './DeckPicker.module.css'

export default function DeckPicker(props: { providers: CardProvider[]; onPick: (id: string) => void }) {
  const [pickedId, setPickedId] = useState<string | null>(null)
  const pick = (id: string) => {
    if (pickedId) return
    setPickedId(id)
    props.onPick(id)
  }

  const tile = (provider: CardProvider) => {
    const loading = pickedId === provider.id
    return (
      <li key={provider.id}>
        <button
          type="button"
          className={`${styles.tile}${pickedId && !loading ? ` ${styles.dimmed}` : ''}`}
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

  const ordered = GROUP_ORDER.flatMap((group) => props.providers.filter((provider) => provider.group === group))
  return (
    <ul className={styles.grid} role="list">
      {ordered.map(tile)}
    </ul>
  )
}

const GROUP_ORDER: DeckGroup[] = ['words', 'abstract', 'photos', 'icons', 'culture']
