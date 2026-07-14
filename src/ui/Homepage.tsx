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
      <div className={styles.hero}>
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
            <button
              type="submit"
              className={`secondary ${styles.joinGo}`}
              aria-label="Join"
              title="Join"
              disabled={!code.trim()}
            >
              →
            </button>
          </form>
        )}
      </header>
      <DeckPicker providers={props.providers} onPick={props.onPick} />
      </div>
      <HowToPlay />
      <a
        className={styles.coffee}
        href="https://www.buymeacoffee.com/lsoares"
        target="_blank"
        rel="noreferrer"
      >
        ☕ Buy me a coffee
      </a>
      <footer className={styles.credit}>
        Based on Codenames, created by Vlaada Chvátil and published by{' '}
        <a href="https://czechgames.com" target="_blank" rel="noreferrer">
          Czech Games Edition
        </a>
        .
      </footer>
    </main>
  )
}
