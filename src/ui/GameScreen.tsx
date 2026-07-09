import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Game, INFINITE_CLUE, type GuessOutcome, type Team } from '../Game'
import type { Action, Player } from '../multiplayer/Session'
import type { CardProvider } from '../cardProviders/providers'
import Board from './Board'
import ClueBar from './ClueBar'
import ThinkingBar from './ThinkingBar'
import DeckPicker from './DeckPicker'
import HowToPlay from './HowToPlay'
import RoomQr from './RoomQr'
import styles from './GameScreen.module.css'

export const spymasterEmoji: Record<Team, string> = { red: '🕵️‍♀️', blue: '🕵️‍♂️' }

export default function GameScreen(props: {
  game: Game
  flash: { text: string; team: Team | null; emoji?: string } | null
  isHost: boolean
  mySeat: Team | null
  myTeam: Team
  seats: { red: string | null; blue: string | null }
  players: Player[]
  selfId: string
  onClaimSeat: (team: Team | null) => void
  onJoinTeam: (team: Team) => void
  onAction: (action: Action) => void
  onNewGame: (providerId: string, rotateSpymaster?: boolean) => void
  loadingFaces: boolean
  providers: CardProvider[]
}) {
  const pickerDialog = useRef<HTMLDialogElement>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(props.players.length < 4)

  const currentDeckId = props.providers.find((p) => p.label === props.game.state.deck)?.id
  const dealFreshBoard = () => {
    if (currentDeckId) props.onNewGame(currentDeckId)
  }

  const requestJoinTeam = (team: Team) => {
    if (team === props.myTeam || props.game.inProgress()) return
    const wasSpymaster = props.mySeat !== null
    props.onJoinTeam(team)
    if (wasSpymaster) dealFreshBoard()
  }

  const [selected, setSelected] = useState<Set<number>>(new Set())
  const animate = (update: () => void) => {
    const doc = document as Document & { startViewTransition?: (run: () => void) => void }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!doc.startViewTransition || reduce) return update()
    doc.startViewTransition(() => flushSync(update))
  }
  const toggleSelected = (index: number) => {
    animate(() =>
      setSelected((prev) => {
        const next = new Set(prev)
        next.has(index) ? next.delete(index) : next.add(index)
        return next
      }),
    )
  }
  const clearSelected = () => animate(() => setSelected(new Set()))
  const dealKey = props.game.state.cards.map((card) => card.color).join(',')
  useEffect(() => {
    setSelected(new Set())
  }, [props.game.state.turn, props.game.isFresh(), dealKey])

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

  const operativesOf = (team: Team): Player[] =>
    props.players.filter(
      (player) => player.team === team && player.id !== props.seats.red && player.id !== props.seats.blue,
    )

  const { winner, phase, turn, clue, clueHistory, guessesRemaining } = props.game.state
  const focus = phase === 'clue' && selected.size > 0
  const guessesGiven = clue ? clue.count + 1 : 0
  const guessesUsed = clue ? guessesGiven - guessesRemaining : 0
  const guessesShown = clue ? Math.min(guessesGiven, props.game.remaining(turn) + guessesUsed) : 0
  const isUnlimitedClue = clue !== null && (clue.count === 0 || clue.count === INFINITE_CLUE)
  const clueCountLabel = (n: number) => (n === INFINITE_CLUE ? '∞' : String(n))
  const acting = props.game.awaitingRole()

  useEffect(() => {
    document.body.dataset.team = props.myTeam
    return () => {
      delete document.body.dataset.team
    }
  }, [props.myTeam])

  const requestSpymasterSeat = (team: Team) => {
    if (props.mySeat === team || props.game.inProgress()) return
    const taken = !!(team === 'red' ? props.seats.red : props.seats.blue)
    if (team !== props.myTeam) props.onJoinTeam(team)
    props.onClaimSeat(team)
    if (taken) dealFreshBoard()
  }

  const renderTeam = (team: Team) => {
    const seatId = team === 'red' ? props.seats.red : props.seats.blue
    const hasSpymaster = !!seatId
    const isMySeat = props.mySeat === team
    const selfFirst = team === 'blue'
    const opPlayers = operativesOf(team).sort((a, b) => {
      if (a.id === props.selfId) return selfFirst ? -1 : 1
      if (b.id === props.selfId) return selfFirst ? 1 : -1
      return 0
    })
    const ops = opPlayers.length
    const headcount = (hasSpymaster ? 1 : 0) + ops
    const active = team === props.game.state.turn
    const isMyTeam = team === props.myTeam
    const spymasterActive = (active && acting === 'spymaster') || undefined
    const editable = !props.game.inProgress()
    const canTakeSeat = !isMySeat && editable
    const spymasterFace = hasSpymaster ? (
      <span role="img" aria-label={`${team} spymaster`}>{spymasterEmoji[team]}</span>
    ) : (
      <span aria-hidden="true" className={styles.spymasterDim}>{spymasterEmoji[team]}</span>
    )
    const spymasterLabel = hasSpymaster
      ? `Replace the ${team} spymaster`
      : `Become ${team} spymaster`
    return (
      <span
        className={styles.team}
        data-team={team}
        data-turn={active || undefined}
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
          {canTakeSeat ? (
            <button
              type="button"
              className={styles.spymasterSlot}
              data-team={team}
              data-active={spymasterActive}
              aria-label={spymasterLabel}
              title={spymasterLabel}
              onClick={() => requestSpymasterSeat(team)}
            >
              {spymasterFace}
            </button>
          ) : (
            <span
              className={styles.spymasterSlot}
              data-team={team}
              data-mine={isMySeat || undefined}
              data-active={spymasterActive}
            >
              {spymasterFace}
            </span>
          )}
          <span className={styles.ops} data-team={team} data-active={(active && acting === 'operatives') || undefined}>
            {opPlayers.map((player) => (
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
            ))}
          </span>
          {!isMyTeam && editable && (
            <button
              type="button"
              className={styles.join}
              data-team={team}
              aria-label={`Join ${team} team`}
              title={`Join ${team} team`}
              onClick={() => requestJoinTeam(team)}
            >
              ＋
            </button>
          )}
        </span>
      </span>
    )
  }

  const confirmDiscard = (): boolean =>
    props.game.idle() || window.confirm('The current game will be lost. Continue?')

  const dealNewCards = () => {
    if (currentDeckId && confirmDiscard()) props.onNewGame(currentDeckId, true)
  }

  const pickCards = () => {
    if (confirmDiscard()) {
      setPickerOpen(true)
      pickerDialog.current?.showModal()
    }
  }

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
                <span className={styles.clueLogCount}>{clueCountLabel(c.count)}</span>
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

  const winnerName = winner ? winner.charAt(0).toUpperCase() + winner.slice(1) : ''
  const winnerEmojis = winner
    ? props.players
        .filter((player) => player.team === winner)
        .map((player) => player.emoji)
        .join(' ')
    : ''

  const statusText = winner
    ? winner === props.myTeam
      ? `🏆 ${winnerName} wins! ${winnerEmojis}`.trim()
      : `😢 ${winnerName} wins…`
    : acting === 'spymaster'
      ? mineTurn
        ? activeSpymaster
          ? `Your turn (${turn})`
          : `${spymasterEmoji[turn]} Your spymaster is thinking…`
        : `${spymasterEmoji[turn]} ${turn.charAt(0).toUpperCase() + turn.slice(1)}'s spymaster is thinking…`
      : mineTurn
        ? props.mySeat
          ? `Your operatives' turn (${turn})`
          : `Your turn (${turn})`
        : `Their operatives' turn (${turn})`

  const centerText = props.flash
    ? `${props.flash.emoji ? `${props.flash.emoji} ` : ''}${props.flash.text}`
    : !winner && phase === 'guess' && clue
      ? `${statusText} — ${clue.word} · ${clueCountLabel(clue.count)}`
      : statusText

  useEffect(() => {
    document.title = centerText

    const role = winner === props.myTeam ? '🏆' : props.mySeat ? spymasterEmoji[props.mySeat] : ''
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

  const myMove = !winner && mineTurn && (acting === 'spymaster' ? activeSpymaster : !activeSpymaster)

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
      key={dealKey}
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
          data-team={props.flash ? (props.flash.team ?? undefined) : (winner ?? turn)}
          data-host={props.isHost || undefined}
        >
          {props.flash ? (
            <span key={props.flash.text} className={styles.statusText} role="status">
              {props.flash.emoji && <span className={styles.flashEmoji}>{props.flash.emoji}</span>}
              {props.flash.text}
            </span>
          ) : (
            <>
              <span key={statusText} className={styles.statusText}>
                {statusText}
              </span>
              {!winner && phase === 'guess' && clue && (
                <span className={styles.clueInline}>
                  <strong className={styles.clueWord}>{clue.word}</strong>
                  {isUnlimitedClue ? (
                    <span
                      className={styles.clueInfinity}
                      role="img"
                      aria-label={clue.count === 0 ? 'zero — unlimited guesses' : 'unlimited guesses'}
                      title={clueCountLabel(clue.count)}
                    >
                      {clueCountLabel(clue.count)}
                    </span>
                  ) : (
                    <span
                      className={styles.pips}
                      role="img"
                      aria-label={`${guessesUsed} used out of ${guessesShown}`}
                      title={`${guessesUsed} used out of ${guessesShown}`}
                    >
                      {Array.from({ length: guessesShown }, (_, i) => (
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
              <button
                type="button"
                className={styles.endAction}
                onClick={dealNewCards}
                aria-label="New game"
                title="New game"
              >
                🔀
              </button>
              <button type="button" className={styles.endAction} onClick={pickCards}>
                Change deck
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
          focus={focus}
          feedback={feedback}
          onToggleSelect={toggleSelected}
          onClearSelection={clearSelected}
          onCardClick={(index) => props.onAction({ type: 'guess', cardIndex: index })}
          onCardMark={(index) => props.onAction({ type: 'toggleMark', cardIndex: index, team: props.myTeam })}
        />
      </div>

      <div className={styles.tools}>
        {menuOpen && <div className={styles.toolsBackdrop} onClick={() => setMenuOpen(false)} />}
        <button
          type="button"
          className={styles.hamburger}
          data-host={props.isHost || undefined}
          aria-label={props.isHost ? 'Menu (you host this room)' : 'Menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <img src="/favicon.svg" alt="" className={styles.hamburgerIcon} />
        </button>
        {menuOpen && (
          <div className={styles.toolsMenu}>
            <RoomQr />
            <div className={styles.toolsFooter}>
              <div className={styles.toolsCreditRow}>
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
                  className={styles.reshuffle}
                  aria-label="New game"
                  title="New game"
                  onClick={() => {
                    setMenuOpen(false)
                    dealNewCards()
                  }}
                >
                  🔀
                </button>
              </div>
              <button
                type="button"
                className={styles.toolItem}
                onClick={() => {
                  setMenuOpen(false)
                  pickCards()
                }}
              >
                Change deck
              </button>
            </div>
          </div>
        )}
      </div>

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
              props.onNewGame(id, true)
              pickerDialog.current?.close()
            }}
          />
        )}
      </dialog>

      {myMove && !stillGathering(props.players) && (
        <div className={styles.thinkingDock}>
          <ThinkingBar key={`${acting}-${clueHistory.length}`} team={turn} />
        </div>
      )}

      <HowToPlay />
    </main>
  )
}
