import { useEffect, useState } from 'react'
import type { CardProvider } from '../images/providers'
import styles from './Homepage.module.css'

// The landing screen: pick a card source to start a game. Each tile previews a
// real sample from its deck, so you see what you're choosing before you play.
export default function Homepage(props: {
  providers: CardProvider[]
  onPick: (id: string) => void
}) {
  return (
    <main className={styles.home}>
      <h1 className={styles.title}>Codenames Pictures</h1>
      <p className={styles.subtitle}>Pick a deck to start a game</p>
      <ul className={styles.grid} role="list">
        {props.providers.map((provider) => (
          <li key={provider.id}>
            <DeckTile provider={provider} onPick={props.onPick} />
          </li>
        ))}
      </ul>
    </main>
  )
}

// One deck tile: fetches a few real faces on mount and shows them as a 2×2
// mosaic behind the deck's name. Falls back to a bare labelled card when the
// source can't be reached (missing key, network error), so the tile is always
// clickable and the homepage never blocks on a flaky source.
function DeckTile(props: { provider: CardProvider; onPick: (id: string) => void }) {
  const [sample, setSample] = useState<string[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    props.provider
      .fetch()
      .then((faces) => alive && setSample(faces.slice(0, 4)))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [props.provider])

  return (
    <button type="button" className={styles.tile} onClick={() => props.onPick(props.provider.id)}>
      <span className={styles.mosaic} aria-hidden="true">
        {sample?.map((face, index) =>
          props.provider.kind === 'image' ? (
            <img key={index} className={styles.cell} src={face} alt="" />
          ) : (
            <span key={index} className={`${styles.cell} ${styles.word}`}>{face}</span>
          ),
        )}
        {!sample && !failed && <span className={styles.skeleton} />}
      </span>
      <span className={styles.label}>{props.provider.label}</span>
    </button>
  )
}
