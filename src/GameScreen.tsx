import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Game, UNLIMITED_CLUE, type GuessOutcome, type Team } from './Game'
import { Roster, type Action } from './Session'
import type { Deck } from './decks'
import { getDefinitionUrl } from './Face'
import { Board } from './components/Board'
import { ClueBar } from './components/ClueBar'
import { ClueDisplay } from './components/ClueDisplay'
import { Confetti } from './components/Confetti'
import { RoomInvite } from './components/RoomInvite'
import { ThinkingBar } from './components/ThinkingBar'
import { track } from './analytics'
import { spymasterEmoji, teamName } from './Team'
import styles from './GameScreen.module.css'

export function GameScreen(props: {
  game: Game
  flash: { text: string; team: Team | null; emoji?: string } | null
  isHost: boolean
  mySeat: Team | null
  myTeam: Team
  roster: Roster
  selfId: string
  onClaimSeat: (team: Team | null) => void
  onJoinTeam: (team: Team) => void
  onAction: (action: Action) => void
  onNewGame: (deckTitle: string, rotateSpymaster?: boolean) => void
  onRepick: () => void
  repicking: Team | null
  loadingFaces: boolean
  decks: Deck[]
}) {
  const currentDeckTitle = props.game.state.deck
  const dealFreshBoard = () => {
    if (currentDeckTitle) props.onNewGame(currentDeckTitle)
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

  // While cards are selected, hold a history entry so the Android back button (and
  // browser back) cancels the selection instead of leaving the room.
  const hasSelection = selected.size > 0
  useEffect(() => {
    if (!hasSelection) return
    window.history.pushState({ codenamesSelection: true }, '')
    const onPopState = () => clearSelected()
    window.addEventListener('popstate', onPopState)
    return () => {
      window.removeEventListener('popstate', onPopState)
      // Selection was cleared some other way (guess, Escape, new deal); drop our entry.
      if ((window.history.state as { codenamesSelection?: boolean } | null)?.codenamesSelection)
        window.history.back()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSelection])

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

  const { winner, phase, turn, clue, clueHistory } = props.game.state
  const focus = phase === 'clue' && selected.size > 0
  const guessesUsed = props.game.guessesUsed()
  const guessesShown = props.game.guessesUsable()
  const isUnlimitedClue = props.game.hasUnlimitedClue()
  const clueCountLabel = (n: number) => (n === UNLIMITED_CLUE ? '∞' : String(n))
  const acting = props.game.awaitingRole()

  useEffect(() => {
    document.body.dataset.team = props.myTeam
    return () => {
      delete document.body.dataset.team
    }
  }, [props.myTeam])

  const requestSpymasterSeat = (team: Team) => {
    if (props.mySeat === team || props.game.inProgress()) return
    const taken = !!props.roster.spymasterOf(team)
    if (team !== props.myTeam) props.onJoinTeam(team)
    props.onClaimSeat(team)
    if (taken) dealFreshBoard()
  }

  const renderCount = (team: Team) => {
    const active = team === turn
    return (
      <span
        className={styles.team}
        data-team={team}
        data-turn={active || undefined}
        title={active ? `${team}'s turn` : undefined}
      >
        <span className={styles.count} data-team={team} title={`${team} cards left to guess`}>
          {props.game.remaining(team)}
        </span>
      </span>
    )
  }

  const renderRoster = (team: Team) => {
    const spymasterId = props.roster.spymasterOf(team)
    const players = props.roster
      .ofTeam(team)
      .sort((a, b) => Number(b.id === spymasterId) - Number(a.id === spymasterId))
    const active = !winner && team === turn
    const editable = !props.game.inProgress()
    const replaceLabel = `Replace the ${team} spymaster`
    const becomeLabel = `Become ${team} spymaster`
    const joinLabel = `Join ${team} team`
    return (
      <ul
        className={styles.roster}
        data-team={team}
        data-turn={active || undefined}
        aria-label={`${team} players`}
      >
        {!spymasterId && editable && (
          <li className={styles.rosterSlot}>
            <button
              type="button"
              className={styles.rosterAction}
              aria-label={becomeLabel}
              title={becomeLabel}
              onClick={() => requestSpymasterSeat(team)}
            >
              <span aria-hidden="true">{spymasterEmoji[team]}</span> Spymaster?
            </button>
          </li>
        )}
        {players.map((player) => {
          const isSpymaster = player.id === spymasterId
          const isMe = player.id === props.selfId
          const role = isSpymaster ? 'spymaster' : 'operative'
          const acts = active && acting === (isSpymaster ? 'spymaster' : 'operatives')
          return (
            <li
              key={player.id}
              className={styles.rosterPlayer}
              data-mine={isMe || undefined}
              data-active={acts || undefined}
            >
              <span role="img" aria-label={`${team} ${role}${isMe ? ' (you)' : ''}`}>
                {player.emoji}
              </span>
              <span className={styles.rosterName} title={player.name}>
                {player.name}
              </span>
              {isSpymaster &&
                (editable && !isMe ? (
                  <button
                    type="button"
                    className={styles.rosterRole}
                    aria-label={replaceLabel}
                    title={replaceLabel}
                    onClick={() => requestSpymasterSeat(team)}
                  >
                    {spymasterEmoji[team]}
                  </button>
                ) : (
                  <span
                    className={styles.rosterRole}
                    title={`${team} spymaster`}
                    aria-hidden="true"
                  >
                    {spymasterEmoji[team]}
                  </span>
                ))}
            </li>
          )
        })}
        {team !== props.myTeam && editable && (
          <li className={styles.rosterSlot}>
            <button
              type="button"
              className={styles.rosterAction}
              aria-label={joinLabel}
              title={joinLabel}
              onClick={() => requestJoinTeam(team)}
            >
              ＋ Join
            </button>
          </li>
        )}
      </ul>
    )
  }

  const confirmDiscard = (): boolean =>
    props.game.idle() || window.confirm('The current game will be lost. Continue?')

  const dealNewCards = (rotateSpymaster: boolean) => {
    if (currentDeckTitle && confirmDiscard()) {
      track('new game clicked', { afterWin: winner !== null })
      props.onNewGame(currentDeckTitle, rotateSpymaster)
    }
  }

  const changeDeck = () => {
    if (confirmDiscard()) {
      track('change deck clicked', { afterWin: winner !== null })
      props.onRepick()
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
                <a
                  className={styles.clueLogWord}
                  href={getDefinitionUrl(c.word)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {c.word}
                </a>
                <span className={styles.clueLogDot}>•</span>
                <span className={styles.clueLogCount}>{clueCountLabel(c.count)}</span>
              </li>
            ))
          )}
        </ul>
      </>
    )
  }

  const renderSide = (team: Team) => (
    <>
      {winner ? renderClues(team) : renderCount(team)}
      {renderRoster(team)}
    </>
  )

  const activeSpymaster = props.mySeat === turn
  const mineTurn = turn === props.myTeam
  const onBonus = clue !== null && guessesUsed >= clue.count

  const winnerName = winner ? teamName(winner) : ''
  const winnerEmojis = winner
    ? props.roster
        .ofTeam(winner)
        .map((player) => player.emoji)
        .join(' ')
    : ''

  const statusText = winner
    ? winner === props.myTeam
      ? `🏆 ${winnerName} wins! ${winnerEmojis}`.trim()
      : `😢 ${winnerName} wins…`
    : acting === 'spymaster'
      ? activeSpymaster
        ? `Your turn (${turn})`
        : `${spymasterEmoji[turn]}💭 ${props.roster.spymasterNameOf(turn)} is thinking…`
      : mineTurn
        ? props.mySeat
          ? `Your operatives' turn (${turn})`
          : onBonus && !isUnlimitedClue
            ? 'One more guess?'
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
    const color =
      getComputedStyle(document.documentElement).getPropertyValue(colorVar).trim() || '#888'
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

  const myMove =
    !winner && mineTurn && (acting === 'spymaster' ? activeSpymaster : !activeSpymaster)

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
      game={props.game}
      selectedCount={selected.size}
      onClue={(word, count) => props.onAction({ type: 'clue', word, count })}
    />
  )

  const repickBanner = props.repicking && (
    <div className={styles.statusPill} data-team={props.repicking}>
      <span className={styles.statusText}>
        {spymasterEmoji[props.repicking]} {props.roster.spymasterNameOf(props.repicking)} is
        choosing a new deck…
      </span>
    </div>
  )

  const statusPill = (
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
          {!winner && phase === 'guess' && clue && (
            <ClueDisplay
              word={clue.word}
              count={clue.count}
              guessesUsed={guessesUsed}
              guessesTotal={guessesShown}
              unlimited={isUnlimitedClue}
            />
          )}
          <span key={statusText} className={styles.statusText}>
            {statusText}
          </span>
          {acting === 'operatives' &&
            mineTurn &&
            props.mySeat === null &&
            props.game.hasGuessedThisTurn() && (
              <button
                type="button"
                className={styles.pass}
                onClick={() => props.onAction({ type: 'endTurn' })}
                aria-label="Pass"
                title="Pass"
              >
                Pass
              </button>
            )}
        </>
      )}
      {winner && props.mySeat && (
        <span className={styles.endActions}>
          <button
            type="button"
            className={styles.endAction}
            onClick={() => dealNewCards(true)}
            aria-label="New game"
            title="New game"
          >
            🔀
          </button>
          <button type="button" className={styles.endAction} onClick={changeDeck}>
            Change deck
          </button>
        </span>
      )}
      {winner && (
        <span className={styles.endLinks}>
          <a
            className={styles.coffee}
            href="https://www.buymeacoffee.com/lsoares"
            target="_blank"
            rel="noreferrer"
            onClick={() => track('coffee clicked', { from: 'end screen' })}
          >
            ☕ Buy me a coffee
          </a>
          <a
            className={styles.endLink}
            href="https://store.czechgames.com/collections/codenames"
            target="_blank"
            rel="noreferrer"
            aria-label="Buy the game"
            title="Buy the game"
            onClick={() => track('buy game clicked', { from: 'end screen' })}
          >
            🛒
          </a>
        </span>
      )}
    </div>
  )

  // While gathering, the turn/"thinking" status is just noise next to the
  // invite — only keep the pill when it actually carries something.
  const showStatus =
    !props.roster.stillGathering() || !!props.flash || !!winner || (phase === 'guess' && !!clue)

  const center = (
    <div className={styles.menu}>
      <div className={styles.menuRow}>
        {clueForm || repickBanner || (showStatus ? statusPill : null)}
      </div>
      {props.roster.stillGathering() && <RoomInvite />}
      {props.mySeat !== null && !winner && props.game.idle() && (
        <button
          type="button"
          className={styles.shuffle}
          aria-label="Shuffle the cards"
          title="Shuffle the cards"
          onClick={() => dealNewCards(false)}
        >
          🔀
        </button>
      )}
    </div>
  )

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <div className={styles.headerSide} data-side="left">
          {renderSide('red')}
        </div>
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
          onCardMark={(index) =>
            props.onAction({ type: 'toggleMark', cardIndex: index, team: props.myTeam })
          }
          markBeforeGuess
        />
      </div>

      {props.game.state.deck && (
        <footer className={styles.footer}>
          {props.game.state.credit?.url ? (
            <a
              className={styles.deckCredit}
              href={props.game.state.credit.url}
              target="_blank"
              rel="noreferrer"
            >
              {props.game.state.deck}, by {props.game.state.credit.label}
            </a>
          ) : (
            <span className={styles.deckCredit}>
              {props.game.state.deck}
              {props.game.state.credit && `, by ${props.game.state.credit.label}`}
            </span>
          )}
        </footer>
      )}

      {props.mySeat && (
        <button
          type="button"
          className={styles.repick}
          aria-label="New game — pick a deck"
          title="New game — pick a deck"
          onClick={changeDeck}
        >
          <img src="/favicon.svg" alt="" className={styles.repickIcon} />
        </button>
      )}

      {myMove && !props.roster.stillGathering() && (
        <div className={styles.thinkingDock}>
          <ThinkingBar key={`${acting}-${clueHistory.length}`} team={turn} />
        </div>
      )}

      {winner === props.myTeam && <Confetti />}
    </main>
  )
}
