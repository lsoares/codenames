import { useState } from 'react'
import type { CardProvider, DeckGroup } from '../cardProviders/providers'
import styles from './DeckPicker.module.css'

export default function DeckPicker(props: {
  providers: CardProvider[]
  onPick: (id: string) => void
  fill?: boolean
}) {
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

  return (
    <div className={`${styles.decks}${props.fill ? ` ${styles.fill}` : ''}`}>
      {GROUPS.map(({ id, title, icon }) => {
        const inGroup = props.providers.filter((provider) => provider.group === id)
        if (inGroup.length === 0) return null
        // Everyday decks first, niche ones after — the row scrolls sideways to reach them.
        const ordered = [
          ...inGroup.filter((provider) => !provider.hidden),
          ...inGroup.filter((provider) => provider.hidden),
        ]
        return (
          <section key={id} className={styles.cluster} aria-label={title}>
            <h3 className={styles.clusterTitle}>
              <span aria-hidden="true">{icon}</span> {title}
            </h3>
            <ul className={styles.row} role="list">
              {ordered.map(tile)}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

const GROUPS: { id: DeckGroup; title: string; icon: string }[] = [
  { id: 'words', title: 'Words', icon: '📝' },
  { id: 'abstract', title: 'Abstract', icon: '🌀' },
  { id: 'photos', title: 'Photos', icon: '📷' },
  { id: 'icons', title: 'Icons', icon: '✳️' },
  { id: 'culture', title: 'Culture', icon: '🎬' },
]
