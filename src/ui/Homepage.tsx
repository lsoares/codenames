import type { CardProvider } from '../cardProviders/providers'
import DeckPicker from './DeckPicker'
import styles from './Homepage.module.css'

// The landing screen: pick a card source to start a game.
export default function Homepage(props: {
  providers: CardProvider[]
  onPick: (id: string) => void
}) {
  return (
    <main className={styles.home}>
      <header className={styles.brand}>
        <img src="/favicon.svg" alt="" className={styles.logo} />
        <h1 className={styles.title}>
          Codenames
          <br />
          <span className={styles.titleAccent}>Anything</span>
        </h1>
      </header>
      <DeckPicker providers={props.providers} onPick={props.onPick} />
    </main>
  )
}
