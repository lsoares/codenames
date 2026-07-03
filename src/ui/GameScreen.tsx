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
  flash: string | null
  isHost: boolean
  mySeat: Team | null
  myTeam: Team
  seats: { red: string | null; blue: string | null }
  playerCount: number
  onClaimSeat: (team: Team | null) => void
  onAction: (action: Action) => void
  onNewGame: (providerId?: string) => void
  providers: { id: string; label: string }[]
  providerId: string
  onProviderChange: (id: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [sourceOpen, setSourceOpen] = useState(false)

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

  // Tint the page background to my team so I always know which side I'm on.
  useEffect(() => {
    document.body.dataset.team = props.myTeam
    return () => {
      delete document.body.dataset.team
    }
  }, [props.myTeam])

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
        <span className={styles.count} data-team={team} title={`${team} cards left`}>
          {remaining(team)}
        </span>
        <span className={styles.players}>
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
      </span>
    )
  }

  const renderMenuItems = () => (
    <div className={styles.menuItems} role="menu">
          <div className={styles.seatPicker}>
            <span className={styles.seatLabel}>I'm spymaster:</span>
            <div className={styles.seatButtons}>
              {(['red', 'blue'] as const).map((team) => {
                const mine = props.mySeat === team
                const taken = team === 'red' ? !!props.seats.red : !!props.seats.blue
                // A taken seat can still be stolen while the game is fresh.
                const fresh = props.state.log.length === 0
                return (
                  <button
                    key={team}
                    type="button"
                    className={styles.seatButton}
                    data-team={team}
                    data-mine={mine || undefined}
                    disabled={taken && !mine && !fresh}
                    onClick={() => props.onClaimSeat(mine ? null : team)}
                  >
                    {team === 'red' ? 'Red' : 'Blue'}
                  </button>
                )
              })}
            </div>
          </div>
          <div className={styles.newGame}>
            <button className={`secondary ${styles.newGameMain}`} onClick={() => props.onNewGame()}>
              New game
            </button>
            <button
              type="button"
              className={`secondary ${styles.newGameMore}`}
              aria-label="Choose card source"
              aria-haspopup="menu"
              aria-expanded={sourceOpen}
              onClick={() => setSourceOpen((open) => !open)}
            >
              ▾
            </button>
            {sourceOpen && (
              <div className={styles.sourceList} role="menu">
                {props.providers.map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    data-current={provider.id === props.providerId || undefined}
                    onClick={() => {
                      setSourceOpen(false)
                      props.onProviderChange(provider.id)
                      props.onNewGame(provider.id)
                    }}
                  >
                    {provider.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
  )

  const renderSide = (team: Team) => renderTeam(team)

  const activeSpymaster = props.mySeat === turn
  const mineTurn = turn === props.myTeam

  // One viewer-centric line about the current moment; doubles as the menu button.
  const statusText = winner
    ? winner === props.myTeam
      ? 'You win! 🏆'
      : 'They win 🏆'
    : phase === 'clue'
      ? mineTurn
        ? activeSpymaster
          ? `Your turn (${turn})`
          : `Your spymaster's turn (${turn})`
        : `The other team (${turn}) is playing`
      : mineTurn
        ? props.mySeat
          ? `Your operatives' turn (${turn})`
          : `Your turn (${turn})`
        : `The other team (${turn}) is playing`

  // Header-centre pill: the live status/clue, and clicking it opens the menu.
  const menuPill = (
    <div className={styles.menu} onClick={(event) => event.stopPropagation()}>
      <button
        className={styles.menuToggle}
        data-team={winner ?? turn}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        title="Menu"
        onClick={() => setMenuOpen((open) => !open)}
      >
        {props.flash ? (
          <span className={styles.statusText}>{props.flash}</span>
        ) : (
          <>
            {!winner && phase === 'guess' && clue && (
              <>
                <strong className={styles.clueWord}>{clue.word}</strong>
                <span className={styles.clueDot}>•</span>
                <span className={styles.clueValue}>{clue.count}</span>
              </>
            )}
            <span className={styles.statusText}>{statusText}</span>
          </>
        )}
      </button>
      {!winner && phase === 'guess' && mineTurn && props.mySeat === null && (
        <button
          className={`secondary ${styles.pass}`}
          onClick={() => props.onAction({ type: 'endTurn' })}
          aria-label="Pass"
          title="Pass"
        >
          ✕
        </button>
      )}
      {menuOpen && renderMenuItems()}
    </div>
  )

  // Only the team-on-turn's spymaster gets the clue input, at the bottom centre.
  const clueForm = !winner && phase === 'clue' && activeSpymaster && (
    <ClueBar
      state={props.state}
      onClue={(word, count) => props.onAction({ type: 'clue', word, count })}
    />
  )

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <div className={styles.headerSide} data-side="left">{renderSide('red')}</div>
        {menuPill}
        <div className={styles.headerSide} data-side="right">
          {renderSide('blue')}
          {props.status && <span className={styles.status}>{props.status}</span>}
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
          mode={props.state.mode}
          spymasterTeam={props.mySeat}
          myTeam={props.myTeam}
          turn={props.state.turn}
          onCardClick={(index) => props.onAction({ type: 'guess', cardIndex: index })}
          onCardMark={(index) => props.onAction({ type: 'toggleMark', cardIndex: index })}
        />
      </div>

      {clueForm && <div className={styles.clueDock}>{clueForm}</div>}
    </main>
  )
}
