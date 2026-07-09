import { useState } from 'react'
import type { CardProvider } from '../cardProviders/providers'
import DeckPicker from './DeckPicker'
import HowToPlay from './HowToPlay'
import styles from './Homepage.module.css'

export default function Homepage(props: {
  providers: CardProvider[]
  onPick: (id: string) => void
  onJoin: (code: string) => void
}) {
  const [code, setCode] = useState('')
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
      <form
        className={styles.join}
        onSubmit={(event) => {
          event.preventDefault()
          props.onJoin(code)
        }}
      >
        <input
          className={styles.joinCode}
          value={code}
          aria-label="Room code"
          placeholder="Room code"
          onChange={(event) => setCode(event.target.value)}
        />
        <button type="submit" className="secondary" disabled={!code.trim()}>
          Join
        </button>
      </form>
      <HowToPlay />
    </main>
  )
}
