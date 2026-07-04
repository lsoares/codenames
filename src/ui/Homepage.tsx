import styles from './Homepage.module.css'

// The landing screen: pick a card source to start a game. Each tile is a source;
// clicking it creates a room from that source. (Live sample previews land next.)
export default function Homepage(props: {
  providers: { id: string; label: string }[]
  onPick: (id: string) => void
}) {
  return (
    <main className={styles.home}>
      <h1 className={styles.title}>Codenames Pictures</h1>
      <p className={styles.subtitle}>Pick a deck to start a game</p>
      <ul className={styles.grid} role="list">
        {props.providers.map((provider) => (
          <li key={provider.id}>
            <button
              type="button"
              className={styles.tile}
              onClick={() => props.onPick(provider.id)}
            >
              {provider.label}
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}
