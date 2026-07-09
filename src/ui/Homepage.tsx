import { useState } from 'react'
import type { CardProvider } from '../cardProviders/providers'
import DeckPicker from './DeckPicker'
import HowToPlay from './HowToPlay'
import styles from './Homepage.module.css'

export default function Homepage(props: {
  providers: CardProvider[]
  onPick: (id: string) => void
  onJoin?: (code: string) => void
}) {
  const [code, setCode] = useState('')
  const onJoin = props.onJoin
  return (
    <main className={styles.home}>
      <header className={styles.top}>
        <div className={styles.brand}>
          <img src="/favicon.svg" alt="" className={styles.logo} />
          <h1 className={styles.title}>
            Codenames
            <br />
            <span className={styles.titleAccent}>Anything</span>
          </h1>
        </div>
        {onJoin && (
          <form
            className={styles.join}
            onSubmit={(event) => {
              event.preventDefault()
              onJoin(code)
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
        )}
      </header>
      <DeckPicker providers={props.providers} onPick={props.onPick} />
      <HowToPlay />
    </main>
  )
}
