import { useEffect, useState } from 'react'
import type { GameState } from '../game/createGame'
import type { Action } from '../game/applyAction'
import Board from './Board'
import ClueBar from './ClueBar'
import GameOver from './GameOver'
import styles from './GameScreen.module.css'

export default function GameScreen(props: {
  state: GameState
  spymaster: boolean
  spymasterCount: number
  onToggleSpymaster: (value: boolean) => void
  onAction: (action: Action) => void
  onNewGame: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  // Close the menu when clicking anywhere outside it.
  useEffect(() => {
    if (!menuOpen) return
    const close = () => setMenuOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menuOpen])

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Codenames Pictures</h1>

        <div className={styles.headerRight}>
          <span className={styles.spymasterCount} title="Spymasters viewing the key">
            🕵️ {props.spymasterCount}
          </span>

          <div className={styles.menu} onClick={(event) => event.stopPropagation()}>
          <button
            className={styles.menuToggle}
            aria-label="Options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            ⋮
          </button>
          {menuOpen && (
            <div className={styles.menuItems} role="menu">
              <button
                className="secondary"
                onClick={() => {
                  void navigator.clipboard?.writeText(window.location.href)
                  setMenuOpen(false)
                }}
              >
                Invite
              </button>
              <label className={styles.spymaster}>
                <input
                  type="checkbox"
                  checked={props.spymaster}
                  onChange={(event) => props.onToggleSpymaster(event.target.checked)}
                />
                Spymaster view
              </label>
              <button className="secondary" onClick={props.onNewGame}>
                New game
              </button>
            </div>
          )}
          </div>
        </div>
      </header>

      {props.state.winner ? (
        <GameOver
          winner={props.state.winner}
          byAssassin={props.state.log[props.state.log.length - 1]?.endsWith('assassin') ?? false}
        />
      ) : (
        <ClueBar
          state={props.state}
          spymaster={props.spymaster}
          onClue={(word, count) => props.onAction({ type: 'clue', word, count })}
          onEndTurn={() => props.onAction({ type: 'endTurn' })}
        />
      )}

      <Board
        cards={props.state.cards}
        spymaster={props.spymaster}
        onCardClick={(index) => props.onAction({ type: 'guess', cardIndex: index })}
      />
    </main>
  )
}
