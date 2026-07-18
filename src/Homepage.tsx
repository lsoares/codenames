import { useRef, useState } from 'react'
import type { BoardSize } from './BoardSize'
import type { Deck } from './decks'
import { BoardSizeSelector } from './components/BoardSizeSelector'
import { DeckPicker } from './DeckPicker'
import { CategoryPicker } from './CategoryPicker'
import { HowToPlay } from './classic/HowToPlay'
import styles from './Homepage.module.css'

export function Homepage(props: {
  decks: Deck[]
  boardSize: BoardSize
  onBoardSizeChange: (size: BoardSize) => void
  onPick: (id: string) => void
  onJoin?: (code: string) => void
  onArena?: () => void
  roomCode?: string
}) {
  const [code, setCode] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<Deck['category'] | undefined>(
    (localStorage.getItem('codenames:category') as Deck['category']) || undefined,
  )
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
          {onJoin ? (
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
          ) : props.roomCode ? (
            <InviteLink roomCode={props.roomCode} />
          ) : null}
        </header>
        <div className={styles.filters}>
          <CategoryPicker
            category={categoryFilter}
            onCategoryChange={(category) => {
              if (category !== categoryFilter) {
                props.onBoardSizeChange(category === 'words' ? '5x5' : '5x4')
              }
              setCategoryFilter(category)
              if (category) localStorage.setItem('codenames:category', category)
              else localStorage.removeItem('codenames:category')
            }}
          />
          <BoardSizeSelector value={props.boardSize} onChange={props.onBoardSizeChange} />
        </div>
        <DeckPicker decks={props.decks} category={categoryFilter} onPick={props.onPick} />
      </div>
      <div className={styles.actions}>
        {props.onArena && (
          <button type="button" className={styles.practice} onClick={props.onArena}>
            🤖 Arena
          </button>
        )}
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
          ☕
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

function InviteLink(props: { roomCode: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number>()
  const url = `https://codenamesany.pages.dev/${props.roomCode}`
  return (
    <span className={styles.invite}>
      <span className={styles.copied} data-show={copied || undefined} aria-live="polite">
        {copied ? 'Copied!' : ''}
      </span>
      <button
        type="button"
        className={styles.inviteButton}
        aria-label="Copy invite link"
        title="Copy invite link"
        onClick={() => {
          void navigator.clipboard?.writeText(url)
          setCopied(true)
          window.clearTimeout(timer.current)
          timer.current = window.setTimeout(() => setCopied(false), 1400)
        }}
      >
        {props.roomCode}
      </button>
    </span>
  )
}
