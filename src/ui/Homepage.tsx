import { useState } from 'react'
import type { Deck } from '../decks'
import DeckPicker from './DeckPicker'
import DeckFilters, { type DeckFilter } from './DeckFilters'
import HowToPlay from './HowToPlay'
import styles from './Homepage.module.css'

export default function Homepage(props: {
  decks: Deck[]
  onPick: (id: string) => void
  onJoin?: (code: string) => void
}) {
  const [code, setCode] = useState('')
  const [filter, setFilter] = useState<DeckFilter>({ group: null, difficulty: 'casual' })
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
        <DeckFilters value={filter} onChange={setFilter} />
        <DeckPicker decks={props.decks} filter={filter} onPick={props.onPick} />
      </div>
      <div className={styles.actions}>
        <HowToPlay />
        <a
          className={styles.buyGame}
          href="https://store.czechgames.com/collections/codenames"
          target="_blank"
          rel="noreferrer"
        >
          🎲 Buy the game
        </a>
        <a
          className={styles.coffee}
          href="https://www.buymeacoffee.com/lsoares"
          target="_blank"
          rel="noreferrer"
        >
          ☕ Buy me a coffee
        </a>
        <a
          className={styles.feedback}
          href="mailto:lsoares@gmail.com?subject=Codenames%20Anything%20feedback"
        >
          💬 Feedback
        </a>
      </div>
      <p className={styles.tagline}>
        Based on Codenames by Vlaada Chvátil ·{' '}
        <a href="https://czechgames.com" target="_blank" rel="noreferrer">
          Czech Games Edition
        </a>
      </p>
    </main>
  )
}
