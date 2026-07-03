import { useEffect, useState } from 'react'
import type { GameState, Team } from '../game/createGame'
import type { Action } from '../game/applyAction'
import Board from './Board'
import ClueBar from './ClueBar'
import GameOver from './GameOver'
import styles from './GameScreen.module.css'

export default function GameScreen(props: {
  state: GameState
  status: string
  isHost: boolean
  mySeat: Team | null
  seats: { red: string | null; blue: string | null }
  playerCount: number
  onClaimSeat: (team: Team | null) => void
  onAction: (action: Action) => void
  onNewGame: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  const remaining = (color: string): number =>
    props.state.cards.filter((card) => card.color === color && !card.revealed).length

  const filledSeats = (props.seats.red ? 1 : 0) + (props.seats.blue ? 1 : 0)
  const operatives = Math.max(0, props.playerCount - filledSeats)
  const opsFor = (team: Team): number =>
    team === 'red' ? Math.ceil(operatives / 2) : Math.floor(operatives / 2)

  // Close the menu when clicking anywhere outside it.
  useEffect(() => {
    if (!menuOpen) return
    const close = () => setMenuOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menuOpen])

  // Reflect play in the tab: the favicon carries the team colour, the title/icon
  // emoji tells spymaster (🕵️) from team (🙂), so a glance at the tab says who's up.
  const { winner, phase, turn, clue } = props.state
  useEffect(() => {
    // The favicon carries colour + role, so the title itself stays plain text.
    const role = winner ? '🏆' : phase === 'clue' ? '🕵️' : ''
    document.title = winner
      ? `${winner === 'red' ? 'Red' : 'Blue'} wins`
      : phase === 'guess'
        ? `${clue?.word} · ${clue?.count}`
        : 'clue…'

    const colorVar = (winner ?? turn) === 'red' ? '--red' : '--blue'
    const color = getComputedStyle(document.documentElement).getPropertyValue(colorVar).trim() || '#888'
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="${color}"/><text x="16" y="25" font-size="22" text-anchor="middle">${role}</text></svg>`
    let icon = document.querySelector('link[rel="icon"]')
    if (!icon) {
      icon = document.createElement('link')
      icon.setAttribute('rel', 'icon')
      document.head.appendChild(icon)
    }
    icon.setAttribute('href', `data:image/svg+xml,${encodeURIComponent(svg)}`)

    return () => {
      document.title = 'Codenames Pictures'
    }
  }, [winner, phase, turn, clue])

  const renderTeam = (team: Team) => {
    const hasSpymaster = team === 'red' ? !!props.seats.red : !!props.seats.blue
    const ops = opsFor(team)
    const active = team === props.state.turn
    return (
      <span
        className={styles.team}
        data-team={team}
        title={active ? `${team}'s turn` : undefined}
      >
        {hasSpymaster && (
          <span
            className={styles.spymasterIcon}
            data-team={team}
            data-active={(active && phase === 'clue') || undefined}
          >
            🕵️
          </span>
        )}
        <span
          className={styles.ops}
          data-team={team}
          data-active={(active && phase === 'guess') || undefined}
        >
          {(winner && winner !== team ? '😢' : '🙂').repeat(ops)}
        </span>
      </span>
    )
  }

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Codenames Pictures</h1>

        {renderTeam('red')}

        <div className={styles.headerCenter} data-turn={turn}>
          {!winner && (
            <ClueBar
              state={props.state}
              spymaster={props.mySeat !== null}
              onClue={(word, count) => props.onAction({ type: 'clue', word, count })}
              onEndTurn={() => props.onAction({ type: 'endTurn' })}
            />
          )}
        </div>

        {renderTeam('blue')}

        <div className={styles.headerRight}>
          {props.status && <span className={styles.status}>{props.status}</span>}

          <div className={styles.menu} onClick={(event) => event.stopPropagation()}>
          <button
            className={styles.menuToggle}
            data-host={props.isHost || undefined}
            title={props.isHost ? 'You are hosting this room' : undefined}
            aria-label="Options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            ⋮
          </button>
          {menuOpen && (
            <div className={styles.menuItems} role="menu">
              <div className={styles.remaining}>
                {(['red', 'blue', 'neutral'] as const).map((color) => (
                  <span key={color} className={styles.remainingItem} title={`${color} cards left`}>
                    {remaining(color)}
                    <span className={styles.swatch} data-color={color} />
                  </span>
                ))}
              </div>
              <div className={styles.seatPicker}>
                <span className={styles.seatLabel}>I'm spymaster:</span>
                <div className={styles.seatButtons}>
                  {(['red', 'blue'] as const).map((team) => {
                    const mine = props.mySeat === team
                    const taken = team === 'red' ? !!props.seats.red : !!props.seats.blue
                    return (
                      <button
                        key={team}
                        type="button"
                        className={styles.seatButton}
                        data-team={team}
                        data-mine={mine || undefined}
                        disabled={taken && !mine}
                        onClick={() => props.onClaimSeat(mine ? null : team)}
                      >
                        {team === 'red' ? 'Red' : 'Blue'}
                      </button>
                    )
                  })}
                </div>
              </div>
              <button className="secondary" onClick={props.onNewGame}>
                New game
              </button>
            </div>
          )}
          </div>
        </div>
      </header>

      {props.state.winner && (
        <GameOver
          winner={props.state.winner}
          byAssassin={props.state.log[props.state.log.length - 1]?.endsWith('assassin') ?? false}
          onNewGame={props.onNewGame}
        />
      )}

      <div className={styles.boardArea}>
        <Board
          cards={props.state.cards}
          spymasterTeam={props.mySeat}
          onCardClick={(index) => props.onAction({ type: 'guess', cardIndex: index })}
          onCardMark={(index) => props.onAction({ type: 'toggleMark', cardIndex: index })}
        />
      </div>
    </main>
  )
}
