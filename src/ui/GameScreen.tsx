import { useEffect, useRef, useState } from 'react'
import { Game, type GuessOutcome, type Team } from '../Game'
import type { Action, Player } from '../multiplayer/Session'
import type { CardProvider } from '../cardProviders/providers'
import Board from './Board'
import ClueBar from './ClueBar'
import DeckPicker from './DeckPicker'
import DebugLog from './DebugLog'
import RoomQr from './RoomQr'
import styles from './GameScreen.module.css'

export default function GameScreen(props: {
  game: Game
  flash: string | null
  isHost: boolean
  mySeat: Team | null
  myTeam: Team
  seats: { red: string | null; blue: string | null }
  players: Player[]
  selfId: string
  onClaimSeat: (team: Team | null) => void
  onJoinTeam: (team: Team) => void
  onAction: (action: Action) => void
  onNewGame: (providerId: string) => void
  loadingFaces: boolean
  providers: CardProvider[]
}) {
  const pickerDialog = useRef<HTMLDialogElement>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  // The corner tools (invite, logs, full screen, deck) live behind one hamburger menu.
  const [menuOpen, setMenuOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [logsOpen, setLogsOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement !== null)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen().catch(() => {})
  }

  // Clicking a team's card joins it as an operative. Already a plain operative
  // there? Nothing to do. Moving to the other side mid-game confirms first;
  // dropping from your own spymaster seat to operative on the same side doesn't.
  const requestJoinTeam = (team: Team) => {
    if (team === props.myTeam && props.mySeat === null) return
    if (team !== props.myTeam && props.game.inProgress() && !window.confirm(`Switch to the ${team} team?`)) return
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
  // Clear the spymaster's picks whenever the turn passes or a new game resets the
  // board, so each clue is planned on a clean slate.
  useEffect(() => {
    setSelected(new Set())
  }, [props.game.state.turn, props.game.isFresh()])

  // Flash the guess outcome over each card the instant it's revealed, so every
  // viewer gets a beat of feedback (a bullseye / cross / shrug / skull) before
  // the card recedes. Compared against the previous state so we react to the
  // reveals in the incoming sync, whoever clicked; the guessing team is whoever
  // was on turn before the reveal, which tells a hit from a miss.
  const [feedback, setFeedback] = useState<Record<number, GuessOutcome>>({})
  const prevGameRef = useRef(props.game)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => {
    const prev = prevGameRef.current
    prevGameRef.current = props.game
    const { guessed } = props.game.changesFrom(prev)
    if (!guessed) return
    setFeedback((current) => ({ ...current, [guessed.index]: guessed.outcome }))
    timersRef.current.push(
      setTimeout(() => {
        setFeedback((current) => {
          const next = { ...current }
          delete next[guessed.index]
          return next
        })
      }, 1300),
    )
  }, [props.game])
  useEffect(() => () => timersRef.current.forEach(clearTimeout), [])

  // Operatives on a team: its members who aren't holding a spymaster seat, so
  // membership follows real state and shifts the instant someone switches.
  const operativesOf = (team: Team): Player[] =>
    props.players.filter(
      (player) => player.team === team && player.id !== props.seats.red && player.id !== props.seats.blue,
    )

  const { winner, phase, turn, clue, clueHistory, guessesRemaining } = props.game.state
  // A clue of N grants N+1 guesses: one pip per guess, the last one the bonus.
  const guessesGiven = clue ? clue.count + 1 : 0
  const guessesUsed = clue ? guessesGiven - guessesRemaining : 0
  // Whose action the turn team awaits: the spymaster clues, the operatives guess.
  const acting = props.game.awaitingRole()

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
      if (props.game.inProgress() && !window.confirm(`Become ${team} spymaster?`)) return
      props.onClaimSeat(team)
    }
  }

  const renderTeam = (team: Team) => {
    const seatId = team === 'red' ? props.seats.red : props.seats.blue
    const hasSpymaster = !!seatId
    const isMySeat = props.mySeat === team
    const opPlayers = operativesOf(team)
    const ops = opPlayers.length
    const headcount = (hasSpymaster ? 1 : 0) + ops
    const active = team === props.game.state.turn
    const spymasterLabel = isMySeat
      ? `Step down as ${team} spymaster`
      : `Become ${team} spymaster`
    const iAmOperativeHere = team === props.myTeam && props.mySeat === null
    const opsLabel = iAmOperativeHere ? `You're on the ${team} team` : `Join ${team} team`
    return (
      <span
        className={styles.team}
        data-team={team}
        title={active ? `${team}'s turn` : undefined}
      >
        <span
          className={styles.count}
          data-team={team}
          title={`${team} cards left to guess`}
        >
          {props.game.remaining(team)}
        </span>
        <span
          className={styles.players}
          title={`${headcount} ${team} player${headcount === 1 ? '' : 's'}`}
        >
          <button
            type="button"
            className={styles.spymasterSlot}
            data-team={team}
            data-mine={isMySeat || undefined}
            data-active={(active && acting === 'spymaster') || undefined}
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
          <button
            type="button"
            className={styles.ops}
            data-team={team}
            data-active={(active && acting === 'operatives') || undefined}
            aria-label={opsLabel}
            title={opsLabel}
            onClick={() => requestJoinTeam(team)}
          >
            {ops > 0 ? (
              opPlayers.map((player) => (
                <span
                  key={player.id}
                  role="img"
                  className={styles.op}
                  data-team={team}
                  data-mine={player.id === props.selfId || undefined}
                  title={player.id === props.selfId ? 'You' : undefined}
                  aria-label={player.id === props.selfId ? `${team} operative (you)` : `${team} operative`}
                >
                  {player.emoji}
                </span>
              ))
            ) : (
              <span aria-hidden="true" className={styles.opsDim}>🙂</span>
            )}
          </button>
        </span>
      </span>
    )
  }

  // Re-dealing wipes the current game, so a game in progress confirms first; a
  // finished or untouched one goes straight through.
  const confirmDiscard = (): boolean =>
    props.game.idle() || window.confirm('The current game will be lost. Continue?')

  // Fresh cards from the deck already in play — resolve its id from the stored
  // deck name (labels are unique). Falls through silently if it can't be found.
  const currentDeckId = props.providers.find((p) => p.label === props.game.state.deck)?.id
  const dealNewCards = () => {
    if (currentDeckId && confirmDiscard()) props.onNewGame(currentDeckId)
  }

  // Open the picker to re-deal from a chosen deck (same room).
  const pickCards = () => {
    if (confirmDiscard()) {
      setPickerOpen(true)
      pickerDialog.current?.showModal()
    }
  }

  // Once the game is over, each side swaps its live team badge for the full run
  // of clues that team gave — a keepsake of how the game was played.
  const renderClues = (team: Team) => {
    const clues = clueHistory.filter((c) => c.team === team)
    return (
      <>
        {team === winner && (
          <span className={styles.clueLogWin} role="img" aria-label={`${team} team wins`}>
            🎉
          </span>
        )}
        <ul className={styles.clueLog} data-team={team} aria-label={`${team} clues`}>
          {clues.length === 0 ? (
            <li className={styles.clueLogEmpty}>—</li>
          ) : (
            clues.map((c, i) => (
              <li key={i}>
                <strong className={styles.clueLogWord}>{c.word}</strong>
                <span className={styles.clueLogDot}>•</span>
                <span className={styles.clueLogCount}>{c.count}</span>
              </li>
            ))
          )}
        </ul>
      </>
    )
  }

  const renderSide = (team: Team) => (winner ? renderClues(team) : renderTeam(team))

  const activeSpymaster = props.mySeat === turn
  const mineTurn = turn === props.myTeam

  // The faces of the winning team, so the win line names who actually took it.
  const winnerEmojis = winner
    ? props.players
        .filter((player) => player.team === winner)
        .map((player) => player.emoji)
        .join(' ')
    : ''

  // One viewer-centric line about the current moment; doubles as the menu button.
  const statusText = winner
    ? `${winner === props.myTeam ? '🏆 You win!' : '😢 They win'} ${winnerEmojis}`.trim()
    : acting === 'spymaster'
      ? mineTurn
        ? activeSpymaster
          ? `Your turn (${turn})`
          : `Your spymaster's turn (${turn})`
        : `Their spymaster's turn (${turn})`
      : mineTurn
        ? props.mySeat
          ? `Your operatives' turn (${turn})`
          : `Your turn (${turn})`
        : `Their operatives' turn (${turn})`

  // The tab title mirrors the header-centre pill text exactly, so a glance at the
  // tab reads the same as the app.
  const centerText = props.flash
    ? props.flash
    : !winner && phase === 'guess' && clue
      ? `${statusText} — ${clue.word} · ${clue.count}`
      : statusText

  // Keep the browser tab in sync: the title mirrors the header-centre text, and
  // the favicon carries my team's colour — 🏆 when my team wins, otherwise the 🕵️
  // glyph while I'm the spymaster — so the tab says what's happening even when the
  // app isn't focused. A loss never turns the favicon sad; it just drops the crown.
  useEffect(() => {
    document.title = centerText

    const role = winner === props.myTeam ? '🏆' : props.mySeat ? '🕵️' : ''
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
      document.title = 'Codenames Anything'
    }
  }, [centerText, props.myTeam, props.mySeat, winner])

  // It's my move to make when my team is on turn and the acting role is mine:
  // the spymaster gives the clue, the operatives do the guessing.
  const myMove = !winner && mineTurn && (acting === 'spymaster' ? activeSpymaster : !activeSpymaster)

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

  const clueForm = !winner && acting === 'spymaster' && activeSpymaster && (
    <ClueBar
      turn={turn}
      teamCardsLeft={props.game.remaining(turn)}
      selectedCount={selected.size}
      onClue={(word, count) => props.onAction({ type: 'clue', word, count })}
    />
  )

  const center = (
    <div className={styles.menu}>
      {clueForm || (
        <div
          className={styles.statusPill}
          data-team={winner ?? turn}
          data-host={props.isHost || undefined}
        >
          {props.flash ? (
            <span className={styles.statusText} role="status">
              {props.flash}
            </span>
          ) : (
            <>
              <span className={styles.statusText}>{statusText}</span>
              {!winner && phase === 'guess' && clue && (
                <span className={styles.clueInline}>
                  <strong className={styles.clueWord}>{clue.word}</strong>
                  {clue.count === 0 ? (
                    <span className={styles.clueInfinity} role="img" aria-label="0 guesses given" title="0">
                      ∞
                    </span>
                  ) : (
                    <span
                      className={styles.pips}
                      role="img"
                      aria-label={`${guessesUsed} used out of ${guessesGiven}`}
                      title={`${guessesUsed} used out of ${guessesGiven}`}
                    >
                      {Array.from({ length: guessesGiven }, (_, i) => (
                        <span
                          key={i}
                          className={styles.pip}
                          data-spent={i < guessesUsed || undefined}
                          data-bonus={i === clue.count || undefined}
                        />
                      ))}
                    </span>
                  )}
                  {acting === 'operatives' && mineTurn && props.mySeat === null && (
                    <button
                      type="button"
                      className={styles.pass}
                      onClick={() => props.onAction({ type: 'endTurn' })}
                      aria-label="Pass"
                      title="Pass"
                    >
                      ✕
                    </button>
                  )}
                </span>
              )}
            </>
          )}
          {winner && props.mySeat && (
            <span className={styles.endActions}>
              <button type="button" className={styles.endAction} onClick={pickCards}>
                New deck
              </button>
              <button type="button" className={styles.endAction} onClick={dealNewCards}>
                New game
              </button>
            </span>
          )}
        </div>
      )}
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
          game={props.game}
          loading={props.loadingFaces}
          spymasterTeam={props.mySeat}
          myTeam={props.myTeam}
          selected={selected}
          feedback={feedback}
          onToggleSelect={toggleSelected}
          onCardClick={(index) => props.onAction({ type: 'guess', cardIndex: index })}
          onCardMark={(index) => props.onAction({ type: 'toggleMark', cardIndex: index, team: props.myTeam })}
        />
      </div>

      <div className={styles.tools}>
        {menuOpen && <div className={styles.toolsBackdrop} onClick={() => setMenuOpen(false)} />}
        <button
          type="button"
          className={styles.hamburger}
          aria-label="Menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          ☰
        </button>
        {menuOpen && (
          <div className={styles.toolsMenu}>
            {props.game.state.deck && (
              <p className={styles.toolsCredit}>
                {props.game.state.credit ? (
                  <a href={props.game.state.credit.url} target="_blank" rel="noreferrer">
                    {props.game.state.deck}, by {props.game.state.credit.label}
                  </a>
                ) : (
                  props.game.state.deck
                )}
              </p>
            )}
            <button
              type="button"
              className={styles.toolItem}
              onClick={() => {
                setMenuOpen(false)
                dealNewCards()
              }}
            >
              New game
            </button>
            <button
              type="button"
              className={styles.toolItem}
              onClick={() => {
                setMenuOpen(false)
                pickCards()
              }}
            >
              New deck
            </button>
            <button
              type="button"
              className={styles.toolItem}
              onClick={() => {
                setMenuOpen(false)
                setShareOpen(true)
              }}
            >
              Invite players
            </button>
            <button
              type="button"
              className={styles.toolItem}
              onClick={() => {
                setMenuOpen(false)
                setLogsOpen(true)
              }}
            >
              Show logs
            </button>
            <button
              type="button"
              className={styles.toolItem}
              onClick={() => {
                setMenuOpen(false)
                toggleFullscreen()
              }}
            >
              {fullscreen ? 'Exit full screen' : 'Full screen'}
            </button>
          </div>
        )}
      </div>

      <RoomQr open={shareOpen} onClose={() => setShareOpen(false)} />
      <DebugLog open={logsOpen} onClose={() => setLogsOpen(false)} />

      <dialog
        ref={pickerDialog}
        className={styles.picker}
        aria-label="Pick a deck"
        onClose={() => setPickerOpen(false)}
        onClick={(event) => {
          if (event.target === pickerDialog.current) pickerDialog.current.close()
        }}
      >
        {pickerOpen && (
          <DeckPicker
            providers={props.providers}
            onPick={(id) => {
              props.onNewGame(id)
              pickerDialog.current?.close()
            }}
          />
        )}
      </dialog>
    </main>
  )
}
