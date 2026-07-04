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
      <h1 className={styles.title}>Codenames Pictures</h1>
      <p className={styles.subtitle}>Pick a deck to start a game</p>
      <DeckPicker providers={props.providers} onPick={props.onPick} />
    </main>
  )
}
