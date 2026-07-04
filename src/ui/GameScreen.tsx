import { useEffect, useRef, useState } from 'react'
import type { GameState, Team } from '../game/createGame'
import { Game, type Action } from '../game/Game'
import Board, { type GuessOutcome } from './Board'
import ClueBar from './ClueBar'
import styles from './GameScreen.module.css'

export default function GameScreen(props: {
  state: GameState
  flash: string | null
  isHost: boolean
  mySeat: Team | null
  myTeam: Team
  seats: { red: string | null; blue: string | null }
  teams: Record<string, Team>
  onClaimSeat: (team: Team | null) => void
  onJoinTeam: (team: Team) => void
  onAction: (action: Action) => void
  onNewGame: (providerId?: string) => void
  loadingFaces: boolean
  providers: { id: string; label: string }[]
  providerId: string
  onProviderChange: (id: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  const game = new Game(props.state)

  // Clicking a team's card joins it as an operative. Already a plain operative
  // there? Nothing to do. Moving to the other side mid-game confirms first;
  // dropping from your own spymaster seat to operative on the same side doesn't.
  const requestJoinTeam = (team: Team) => {
    if (team === props.myTeam && props.mySeat === null) return
    if (team !== props.myTeam && game.inProgress() && !window.confirm(`Switch to the ${team} team?`)) return
    props.onJoinTeam(team)
  }

  // The spymaster's private card picks, owned here so the clue's proposed number
  // can follow them. Cleared when the turn passes or a new game starts, so each
  // clue is planned on a clean board.
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const toggleSelected = (index: number) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(index) ? next.delete(index) : next.add(index)
      return next
    })
  useEffect(() => {
    setSelected(new Set())
  }, [props.state.turn])
  useEffect(() => {
    if (game.isFresh()) setSelected(new Set())
  }, [game.isFresh()])

  // Flash the guess outcome over each card the instant it's revealed, so every
  // viewer gets a beat of feedback (a bullseye / cross / shrug / skull) before
  // the card recedes. Compared against the previous state so we react to the
  // reveals in the incoming sync, whoever clicked; the guessing team is whoever
  // was on turn before the reveal, which tells a hit from a miss.
  const [feedback, setFeedback] = useState<Record<number, GuessOutcome>>({})
  const prevStateRef = useRef(props.state)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => {
    const prev = prevStateRef.current
    prevStateRef.current = props.state
    const guessingTeam = prev.turn
    props.state.cards.forEach((card, index) => {
      if (!card.revealed || prev.cards[index]?.revealed) return
      const outcome: GuessOutcome =
        card.color === 'assassin'
          ? 'assassin'
          : card.color === 'neutral'
            ? 'neutral'
            : card.color === guessingTeam
              ? 'correct'
              : 'wrong'
      setFeedback((current) => ({ ...current, [index]: outcome }))
      timersRef.current.push(
        setTimeout(() => {
          setFeedback((current) => {
            const next = { ...current }
            delete next[index]
            return next
          })
        }, 1300),
      )
    })
  }, [props.state])
  useEffect(() => () => timersRef.current.forEach(clearTimeout), [])

  // Operatives on a team: its members who aren't holding a spymaster seat, so
  // the count follows real membership and shifts the instant someone switches.
  const opsFor = (team: Team): number =>
    Object.entries(props.teams).filter(
      ([id, t]) => t === team && id !== props.seats.red && id !== props.seats.blue,
    ).length

  useEffect(() => {
    if (!menuOpen) return
    const close = () => setMenuOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menuOpen])

  const { winner, phase, turn, clue } = props.state

  // Tint the page background to my team so I always know which side I'm on.
  useEffect(() => {
    document.body.dataset.team = props.myTeam
    return () => {
      delete document.body.dataset.team
    }
  }, [props.myTeam])

  const requestSpymasterSeat = (team: Team) => {
    const isMine = props.mySeat === team
    if (isMine) {
      // Stepping down: never prompt.
      props.onClaimSeat(null)
    } else {
      // Claiming: prompt mid-game only.
      if (game.inProgress() && !window.confirm(`Become ${team} spymaster?`)) return
      props.onClaimSeat(team)
    }
  }

  const renderTeam = (team: Team) => {
    const seatId = team === 'red' ? props.seats.red : props.seats.blue
    const hasSpymaster = !!seatId
    const isMySeat = props.mySeat === team
    const ops = opsFor(team)
    const headcount = (hasSpymaster ? 1 : 0) + ops
    const active = team === props.state.turn
    const spymasterLabel = isMySeat
      ? `Step down as ${team} spymaster`
      : `Become ${team} spymaster`
    return (
      <span
        className={styles.team}
        data-team={team}
        title={active ? `${team}'s turn` : undefined}
      >
        <button
          type="button"
          className={styles.count}
          data-team={team}
          aria-label={`Join ${team} team`}
          title={`${team} cards left`}
          onClick={() => requestJoinTeam(team)}
        >
          {game.remaining(team)}
        </button>
        <span
          className={styles.players}
          title={`${headcount} ${team} player${headcount === 1 ? '' : 's'}`}
        >
          <button
            type="button"
            className={styles.spymasterSlot}
            data-team={team}
            data-mine={isMySeat || undefined}
            data-active={(active && phase === 'clue') || undefined}
            aria-label={spymasterLabel}
            title={spymasterLabel}
            onClick={() => requestSpymasterSeat(team)}
          >
            {hasSpymaster ? (
              <span role="img" aria-label={`${team} spymaster`}>🕵️</span>
            ) : (
              <span aria-hidden="true" className={styles.spymasterDim}>🕵️</span>
            )}
          </button>
          <span
            className={styles.ops}
            data-team={team}
            data-active={(active && phase === 'guess') || undefined}
          >
            {Array.from({ length: ops }, (_, i) => (
              <span key={i} role="img" aria-label={`${team} operative`}>
                {winner && winner !== team ? '😢' : '🙂'}
              </span>
            ))}
          </span>
        </span>
      </span>
    )
  }

  // A game in progress shouldn't be wiped by accident; confirm before starting a
  // new one. A finished or still-untouched game starts immediately.
  const confirmNewGame = (): boolean =>
    game.idle() || window.confirm('Start a new game? The current game will be lost.')

  const renderMenuItems = () => (
    <div
      className={styles.menuItems}
      role="menu"
      onClick={(event) => event.stopPropagation()}
    >
          <div className={styles.sourceList}>
            {props.providers.map((provider) => (
              <button
                key={provider.id}
                type="button"
                data-current={provider.id === props.providerId || undefined}
                onClick={() => {
                  if (!confirmNewGame()) return
                  props.onProviderChange(provider.id)
                  props.onNewGame(provider.id)
                  setMenuOpen(false)
                }}
              >
                {provider.label}
              </button>
            ))}
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
      : 'They win 😢'
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

  // The tab title mirrors the header-centre pill text exactly, so a glance at the
  // tab reads the same as the app.
  const centerText = props.flash
    ? props.flash
    : !winner && phase === 'guess' && clue
      ? `${statusText} — ${clue.word} · ${clue.count}`
      : statusText

  // Keep the browser tab in sync: the title mirrors the header-centre text, and
  // the favicon carries my team's colour — plus the 🕵️ glyph only when I'm the
  // spymaster — so the tab says what's happening even when the app isn't focused.
  useEffect(() => {
    document.title = centerText

    const role = winner ? (winner === props.myTeam ? '🏆' : '😢') : props.mySeat ? '🕵️' : ''
    const colorVar = props.myTeam === 'red' ? '--red' : '--blue'
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
  }, [centerText, props.myTeam, props.mySeat, winner])

  // It's my move to make when my team is on turn and the acting role is mine:
  // the spymaster gives the clue, the operatives do the guessing.
  const myMove = !winner && mineTurn && (phase === 'clue' ? activeSpymaster : !activeSpymaster)

  // When it's my move but the tab is in the background, pulse the title so the
  // tab flashes for attention; the moment the tab is focused again, restore it.
  useEffect(() => {
    if (!myMove) return
    const interval = setInterval(() => {
      if (document.hidden) {
        document.title = document.title.startsWith('🔔') ? centerText : '🔔 Your turn'
      }
    }, 1000)
    const restore = () => {
      if (!document.hidden) document.title = centerText
    }
    document.addEventListener('visibilitychange', restore)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', restore)
    }
  }, [myMove, centerText])

  const clueForm = !winner && phase === 'clue' && activeSpymaster && (
    <ClueBar
      state={props.state}
      selectedCount={selected.size}
      onClue={(word, count) => props.onAction({ type: 'clue', word, count })}
    />
  )

  // Header centre: the status/clue pill that also opens the menu. On the active
  // spymaster's clue turn the clue input takes centre stage and the menu shrinks
  // to a compact button beside it, so the menu stays reachable throughout.
  const center = (
    <div className={styles.menu}>
      <button
        className={styles.menuToggle}
        data-team={winner ?? turn}
        data-compact={clueForm ? true : undefined}
        data-host={props.isHost || undefined}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        title="Menu"
        onClick={(event) => {
          event.stopPropagation()
          setMenuOpen((open) => !open)
        }}
      >
        {clueForm ? (
          <span className={styles.plus} aria-hidden="true">
            +
          </span>
        ) : props.flash ? (
          <span className={styles.statusText} role="status">
            {props.flash}
          </span>
        ) : (
          <>
            <span className={styles.statusText}>{statusText}</span>
            {!winner && phase === 'guess' && clue && (
              <>
                <strong className={styles.clueWord}>{clue.word}</strong>
                <span className={styles.clueDot}>•</span>
                <span className={styles.clueValue}>{clue.count}</span>
              </>
            )}
          </>
        )}
      </button>
      {clueForm}
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

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <div className={styles.headerSide} data-side="left">{renderSide('red')}</div>
        {center}
        <div className={styles.headerSide} data-side="right">
          {renderSide('blue')}
        </div>
      </header>

      <div className={styles.boardArea}>
        <Board
          cards={props.state.cards}
          mode={props.state.mode}
          loading={props.loadingFaces}
          spymasterTeam={props.mySeat}
          myTeam={props.myTeam}
          turn={props.state.turn}
          selected={selected}
          feedback={feedback}
          onToggleSelect={toggleSelected}
          onCardClick={(index) => props.onAction({ type: 'guess', cardIndex: index })}
          onCardMark={(index) => props.onAction({ type: 'toggleMark', cardIndex: index, team: props.myTeam })}
        />
      </div>
    </main>
  )
}
