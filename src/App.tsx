import { useEffect, useRef, useState } from 'react'
import styles from './App.module.css'
import { boardSize, compositionFor, Game, type BoardSize, type GameState, type Team } from './Game'
import { identify, track } from './analytics'
import { decks, findDeck } from './decks'
import { Guest, JoinError } from './multiplayer/Guest'
import { Host } from './multiplayer/Host'
import { RoomCode } from './multiplayer/RoomCode'
import {
  Roster,
  type Action,
  type MolesView,
  type Player,
  type Session,
} from './multiplayer/Session'
import { Takeover } from './multiplayer/Takeover'
import { playSound } from './sound'
import { SoloGame, createSoloGame } from './SoloGame'
import { AiSetup } from './ai/AiSetup'
import { getApiKey } from './ai/keyStore'
import { creditOf } from './decks'
import { GameScreen, spymasterEmoji } from './ui/GameScreen'
import { Homepage } from './ui/Homepage'
import { SoloGameScreen } from './ui/SoloGameScreen'
import { SpymasterSoloGameScreen } from './ui/SpymasterSoloGameScreen'

export function App() {
  const [game, setGame] = useState<Game | null>(null)
  const [repicking, setRepicking] = useState(false)
  const [roomCode, setRoomCode] = useState('')
  const [seats, setSeats] = useState<{
    red: string | null
    blue: string | null
  }>({
    red: null,
    blue: null,
  })
  const [players, setPlayers] = useState<Player[]>([])
  const [moles, setMoles] = useState<MolesView | null>(null)
  const [repickingTeam, setRepickingTeam] = useState<Team | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [loadingFaces, setLoadingFaces] = useState(false)
  const [selectedBoardSize, setSelectedBoardSize] = useState<BoardSize>('5x4')
  const [status, setStatus] = useState('')
  const sessionRef = useRef<Session | null>(null)
  const isHostRef = useRef(false)
  const startedRef = useRef(false)
  const gameRef = useRef<Game | null>(null)
  const peersRef = useRef<string[]>([])
  const selfIdRef = useRef('')
  const roomCodeRef = useRef('')
  const repickingRef = useRef(false)
  const identifiedRef = useRef(false)
  const [soloMode, setSoloMode] = useState<'off' | 'operative' | 'spymaster'>('off')
  const soloModeRef = useRef(soloMode)
  soloModeRef.current = soloMode
  const [soloGame, setSoloGame] = useState<SoloGame | null>(null)
  const [apiKey, setApiKeyState] = useState<string | null>(null)
  const [needsApiKey, setNeedsApiKey] = useState(false)
  const [pendingSoloDeck, setPendingSoloDeck] = useState<string | null>(null)
  const [flash, setFlash] = useState<{
    text: string
    team: Team | null
    emoji?: string
  } | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const notify = (text: string, team: Team | null = null, emoji?: string, sticky = false) => {
    setFlash({ text, team, emoji })
    clearTimeout(flashTimer.current)
    if (!sticky) flashTimer.current = setTimeout(() => setFlash(null), 3000)
  }

  const wire = (session: Session, asHost: boolean) => {
    sessionRef.current = session
    isHostRef.current = asHost
    setIsHost(asHost)
    selfIdRef.current = session.selfId
    roomCodeRef.current = session.roomCode
    identifiedRef.current = false
    setRoomCode(session.roomCode)
    history.pushState({}, '', '/' + session.roomCode)
    session.subscribe((view) => {
      const next = new Game(view.state)
      gameRef.current = next
      peersRef.current = view.players.map((player) => player.id)
      setGame(next)
      setSeats(view.seats)
      setPlayers(view.players)
      setMoles(view.moles ?? null)
      setRepickingTeam(view.repicking ?? null)
      if (session.selfEmoji && !identifiedRef.current) {
        identifiedRef.current = true
        identify(session.roomCode, session.selfEmoji)
      }
    })
    if (!asHost) session.onDisconnect(() => migrate())
    const pinnedTeam = localStorage.getItem('codenames:start-team') as Team | null
    if (pinnedTeam) session.setTeam(pinnedTeam)
  }

  const migrate = () => {
    if (isHostRef.current) return
    const takeover = new Takeover(peersRef.current, selfIdRef.current)
    window.setTimeout(async () => {
      const game = gameRef.current
      if (!game || isHostRef.current) return
      sessionRef.current?.close()
      try {
        const { session, asHost } = await takeover.claim(roomCodeRef.current, game.state)
        wire(session, asHost)
        playSound('takeover')
        notify(asHost ? 'You took over as host' : "You're back in the room")
      } catch {
        setGame(null)
        setStatus('Lost connection to the room.')
      }
    }, takeover.myTurnDelayMs())
  }

  repickingRef.current = repicking

  const roster = new Roster(players, seats)
  const mySeat: Team | null = roster.seatOf(selfIdRef.current)
  const myTeam: Team = mySeat ?? roster.teamOf(selfIdRef.current) ?? 'red'

  const newGame = async (title: string, rotate = false) => {
    setLoadingFaces(true)
    try {
      const deck = findDeck(title)
      const total = boardSize(compositionFor(selectedBoardSize))
      const faces = await deck.fetch(total)
      sessionRef.current?.dispatch({
        type: 'newGame',
        deckTitle: deck.title,
        faces,
        boardSize: selectedBoardSize,
        rotate,
      })
      track('game started', { deck: deck.title })
    } catch (error) {
      notify(
        `Couldn't deal that deck (${(error as Error)?.message ?? 'unknown error'})`,
        null,
        '😕',
      )
    } finally {
      setLoadingFaces(false)
    }
  }

  const claimSeat = (team: Team | null) => {
    sessionRef.current?.setSpymaster(team)
    if (team) playSound('spymaster')
  }

  const joinTeam = (team: Team) => {
    sessionRef.current?.setTeam(team)
    playSound('teamSwitch')
  }

  const goHome = () => {
    sessionRef.current?.close()
    sessionRef.current = null
    isHostRef.current = false
    selfIdRef.current = ''
    roomCodeRef.current = ''
    identifiedRef.current = false
    gameRef.current = null
    peersRef.current = []
    prevGameRef.current = null
    prevPlayersRef.current = null
    prevSeatsRef.current = null
    clearTimeout(flashTimer.current)
    setFlash(null)
    setIsHost(false)
    setGame(null)
    setRoomCode('')
    setSeats({ red: null, blue: null })
    setPlayers([])
    setMoles(null)
    setRepickingTeam(null)
    setStatus('')
    setSoloMode('off')
    setSoloGame(null)
    setApiKeyState(null)
    setNeedsApiKey(false)
    setPendingSoloDeck(null)
  }

  useEffect(() => {
    const onPopState = () => {
      if (soloModeRef.current !== 'off' && window.location.pathname !== '/practice') {
        setSoloMode('off')
        setSoloGame(null)
        setApiKeyState(null)
        setNeedsApiKey(false)
        setPendingSoloDeck(null)
        return
      }
      if (RoomCode.fromPath(window.location.pathname)) return
      // The deck picker opened over a room is a sub-screen, not a fresh page:
      // backing out of it cancels the repick and keeps the room, rather than
      // tearing the session down and leaving for the homepage.
      if (repickingRef.current && roomCodeRef.current) {
        setRepicking(false)
        sessionRef.current?.setRepicking(null)
        history.pushState({}, '', '/' + roomCodeRef.current)
        return
      }
      goHome()
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const createRoom = async (title: string, code?: string) => {
    const start = (localStorage.getItem('codenames:start-team') as Team | null) ?? randomTeam()
    try {
      const deck = findDeck(title)
      const total = boardSize(compositionFor(selectedBoardSize))
      const faces = await deck.fetch(total)
      wire(await Host.start(deck, faces, start, selectedBoardSize, code), true)
      track('room created', { deck: deck.title })
    } catch (error) {
      if (code && (error as { type?: string })?.type === 'unavailable-id') {
        const joined = await Guest.join(code)
          .then((session) => (wire(session, false), true))
          .catch(() => false)
        if (joined) return
      }
      console.error('createRoom failed:', error)
      setStatus(
        `Could not create room (${(error as { type?: string })?.type ?? (error as Error)?.message ?? 'unknown'}). Try again.`,
      )
    }
  }

  const prevGameRef = useRef<Game | null>(null)
  useEffect(() => {
    const prev = prevGameRef.current
    prevGameRef.current = game
    if (!game || !prev) return
    const change = game.changesFrom(prev)
    if (change.newGame) {
      playSound('newGame')
      notify(`New game — ${teamName(game.state.turn)} starts 🔀`, game.state.turn)
      return
    }
    if (change.win) {
      playSound(
        change.win.byAssassin ? 'assassin' : change.win.team === myTeam ? 'victory' : 'gameOver',
      )
      if (change.win.byAssassin)
        notify(`💀 Assassin! ${teamName(change.win.team)} wins`, change.win.team)
    } else if (change.clueGiven) {
      playSound('clue')
    } else if (change.guessed && change.guessed.outcome === 'correct') {
      playSound('guessRight')
    } else if (change.turnPassed) {
      const wrongGuess = change.guessed && change.guessed.outcome !== 'correct'
      playSound(wrongGuess ? 'guessWrong' : 'endTurn')
      if (change.guessed && change.guessed.outcome !== 'correct') {
        const hit =
          change.guessed.outcome === 'neutral'
            ? 'a neutral'
            : `${teamName(change.turnPassed.from)}'s card`
        notify(
          `${teamName(change.turnPassed.from)} hit ${hit} — ${teamName(change.turnPassed.to)}'s turn`,
          change.turnPassed.to,
        )
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game])

  const prevPlayersRef = useRef<Player[] | null>(null)
  useEffect(() => {
    if (!game) return
    const prev = prevPlayersRef.current
    prevPlayersRef.current = players
    if (prev === null) return
    const joined = players.find((player) => !prev.some((was) => was.id === player.id))
    const gone = prev.find((was) => !players.some((player) => player.id === was.id))
    if (joined) notify(`joined ${teamName(joined.team)} 👋`, joined.team, joined.emoji)
    else if (gone) notify('left', gone.team, gone.emoji)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, game])

  const prevSeatsRef = useRef<typeof seats | null>(null)
  useEffect(() => {
    if (!game) return
    const prev = prevSeatsRef.current
    prevSeatsRef.current = seats
    if (!prev) return
    for (const team of ['red', 'blue'] as const) {
      if (seats[team] && seats[team] !== prev[team] && seats[team] !== selfIdRef.current) {
        playSound('spymaster')
        notify(`New ${team} spymaster ${spymasterEmoji[team]}`, team)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seats, game])

  useEffect(() => {
    if (isHostRef.current && roomCode && game) {
      sessionStorage.setItem(hostStateKey(roomCode), JSON.stringify(game.state))
    }
  }, [game, roomCode])

  const attemptJoin = () => {
    const code = RoomCode.fromPath(window.location.pathname)?.toString()
    if (!code) return

    setStatus(`Joining ${code}…`)
    const saved = sessionStorage.getItem(hostStateKey(code))
    Guest.join(code, { waitForHost: !saved })
      .then((session) => {
        wire(session, false)
        track('room joined')
        setStatus('')
      })
      .catch((error) => {
        if (!saved) {
          if (error instanceof JoinError && error.reason === 'room-not-found') {
            setStatus('')
            return
          }
          setStatus(joinFailureMessage(error))
          return
        }
        setStatus('Rejoining the room…')
        Host.resume(code, JSON.parse(saved) as GameState)
          .then((session) => {
            wire(session, true)
            setStatus('')
          })
          .catch(() => setStatus('Could not rejoin the room.'))
      })
  }

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    if (window.location.pathname === '/practice') {
      setSoloMode('operative')
      void startSoloGame('Words')
      return
    }
    attemptJoin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startSoloGame = async (title: string) => {
    const key = await getApiKey()
    if (!key) {
      setPendingSoloDeck(title)
      setNeedsApiKey(true)
      return
    }
    setApiKeyState(key)
    const deck = findDeck(title)
    const total = selectedBoardSize === '5x4' ? 20 : 25
    const faces = await deck.fetch(total)
    setSoloGame(new SoloGame(createSoloGame(faces, deck.title, creditOf(deck), selectedBoardSize)))
  }

  const onApiKeyReady = async (key: string) => {
    setApiKeyState(key)
    setNeedsApiKey(false)
    if (pendingSoloDeck) {
      const title = pendingSoloDeck
      setPendingSoloDeck(null)
      const deck = findDeck(title)
      const total = selectedBoardSize === '5x4' ? 20 : 25
      const faces = await deck.fetch(total)
      setSoloGame(
        new SoloGame(createSoloGame(faces, deck.title, creditOf(deck), selectedBoardSize)),
      )
    }
  }

  return (
    <>
      {needsApiKey ? (
        <AiSetup onReady={onApiKeyReady} />
      ) : soloGame && apiKey && soloMode === 'operative' ? (
        <SoloGameScreen
          game={soloGame}
          apiKey={apiKey}
          onGameUpdate={setSoloGame}
          onNewGame={async () => {
            setSoloMode('spymaster')
            const title = soloGame.state.deck
            if (title) await startSoloGame(title)
          }}
          onSwitchRole={async () => {
            setSoloMode('spymaster')
            const title = soloGame.state.deck
            if (title) await startSoloGame(title)
          }}
          onHome={() => {
            history.pushState({}, '', '/')
            goHome()
          }}
        />
      ) : soloGame && apiKey && soloMode === 'spymaster' ? (
        <SpymasterSoloGameScreen
          game={soloGame}
          apiKey={apiKey}
          onGameUpdate={setSoloGame}
          onNewGame={async () => {
            setSoloMode('operative')
            const title = soloGame.state.deck
            if (title) await startSoloGame(title)
          }}
          onSwitchRole={async () => {
            setSoloMode('operative')
            const title = soloGame.state.deck
            if (title) await startSoloGame(title)
          }}
          onHome={() => {
            history.pushState({}, '', '/')
            goHome()
          }}
        />
      ) : game && !repicking ? (
        <GameScreen
          game={game}
          flash={flash}
          isHost={isHost}
          mySeat={mySeat}
          myTeam={myTeam}
          roster={roster}
          selfId={selfIdRef.current}
          onClaimSeat={claimSeat}
          onJoinTeam={joinTeam}
          onAction={(action: Action) => sessionRef.current?.dispatch(action)}
          onNewGame={newGame}
          onRepick={() => {
            setRepicking(true)
            sessionRef.current?.setRepicking(myTeam)
          }}
          repicking={repickingTeam}
          moles={moles}
          onWhack={(moleId, reactionMs) => sessionRef.current?.whack(moleId, reactionMs)}
          loadingFaces={loadingFaces}
          decks={decks}
        />
      ) : status ? (
        <div className={styles.status} role="status">
          {status}
          {/^(Could not|Lost)/.test(status) && (
            <div className={styles.statusActions}>
              <button onClick={attemptJoin}>Retry</button>
              <button
                className="secondary"
                onClick={() => {
                  history.pushState({}, '', '/')
                  goHome()
                }}
              >
                New game
              </button>
            </div>
          )}
        </div>
      ) : (
        <Homepage
          decks={decks}
          boardSize={selectedBoardSize}
          onBoardSizeChange={setSelectedBoardSize}
          onPick={(title) => {
            if (game) {
              sessionRef.current?.setRepicking(null)
              void newGame(title, true)
              setRepicking(false)
            } else {
              void createRoom(title, RoomCode.fromPath(window.location.pathname)?.toString())
            }
          }}
          onPractice={() => {
            setSoloMode('operative')
            history.pushState({}, '', '/practice')
            void startSoloGame('Words')
          }}
          onJoin={
            game || RoomCode.fromPath(window.location.pathname)
              ? undefined
              : (raw) => {
                  const code = RoomCode.fromTyped(raw)
                  if (!code) return
                  history.pushState({}, '', '/' + code)
                  attemptJoin()
                }
          }
        />
      )}
    </>
  )
}

const randomTeam = (): Team => (Math.random() < 0.5 ? 'red' : 'blue')

const teamName = (team: Team): string => (team === 'red' ? 'Red' : 'Blue')

const hostStateKey = (code: string): string => `codenames:host:${code}`

const joinFailureMessage = (error: unknown): string => {
  switch (error instanceof JoinError ? error.reason : null) {
    case 'room-not-found':
      return 'Could not find the room. Check the room code or link, or ask the host for a fresh one.'
    case 'connection-blocked':
      return 'Could not connect — the room is there, but your network is blocking it. Another network (like a phone hotspot) usually helps.'
    default:
      return 'Could not reach the server. Check your internet and try again.'
  }
}
