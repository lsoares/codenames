import { useEffect, useRef, useState } from 'react'
import { Game, type GameState, type Team } from './Game'
import { getFaces, providers } from './cardProviders/providers'
import { Host } from './multiplayer/Host'
import { Guest, JoinError } from './multiplayer/Guest'
import { Roster, type Session, type Action, type Player } from './multiplayer/Session'
import { restoreDash } from './multiplayer/peer'
import { playSound } from './sound'
import GameScreen, { spymasterEmoji } from './ui/GameScreen'
import Homepage from './ui/Homepage'
import styles from './App.module.css'

const randomTeam = (): Team => (Math.random() < 0.5 ? 'red' : 'blue')

const teamName = (team: Team): string => (team === 'red' ? 'Red' : 'Blue')

const normalizeCode = (raw: string): string =>
  raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

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

export default function App() {
  const [game, setGame] = useState<Game | null>(null)
  const [roomCode, setRoomCode] = useState('')
  const [seats, setSeats] = useState<{ red: string | null; blue: string | null }>({
    red: null,
    blue: null,
  })
  const [players, setPlayers] = useState<Player[]>([])
  const [isHost, setIsHost] = useState(false)
  const [loadingFaces, setLoadingFaces] = useState(false)
  const [status, setStatus] = useState('')
  const sessionRef = useRef<Session | null>(null)
  const isHostRef = useRef(false)
  const startedRef = useRef(false)
  const gameRef = useRef<Game | null>(null)
  const peersRef = useRef<string[]>([])
  const selfIdRef = useRef('')
  const roomCodeRef = useRef('')
  const [flash, setFlash] = useState<{ text: string; team: Team | null; emoji?: string } | null>(null)
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
    setRoomCode(session.roomCode)
    history.pushState({}, '', '/' + session.roomCode)
    session.subscribe((view) => {
      const next = new Game(view.state)
      gameRef.current = next
      peersRef.current = view.players.map((player) => player.id)
      setGame(next)
      setSeats(view.seats)
      setPlayers(view.players)
    })
    if (!asHost) session.onDisconnect(() => migrate())
    const pinnedTeam = localStorage.getItem('codenames:start-team') as Team | null
    if (pinnedTeam) session.setTeam(pinnedTeam)
  }

  const migrate = () => {
    if (isHostRef.current) return
    const deadHost = peersRef.current[0]
    const survivors = peersRef.current.filter((id) => id !== deadHost).sort()
    const rank = survivors.indexOf(selfIdRef.current)
    const delay = (rank < 0 ? survivors.length : rank) * 1500
    window.setTimeout(async () => {
      const game = gameRef.current
      if (!game || isHostRef.current) return
      sessionRef.current?.close()
      try {
        wire(await Host.resume(roomCodeRef.current, game.state), true)
        playSound('takeover')
        notify('You took over as host')
      } catch {
        try {
          wire(await Guest.join(roomCodeRef.current), false)
          playSound('takeover')
          notify("You're back in the room")
        } catch {
          setGame(null)
          setStatus('Lost connection to the room.')
        }
      }
    }, delay)
  }

  const roster = new Roster(players, seats)
  const mySeat: Team | null = roster.seatOf(selfIdRef.current)
  const myTeam: Team = mySeat ?? roster.teamOf(selfIdRef.current) ?? 'red'

  const newGame = async (id: string, rotate = false) => {
    setLoadingFaces(true)
    try {
      const { faces, credit, deck } = await getFaces(id)
      sessionRef.current?.dispatch({ type: 'newGame', faces, credit, deck, rotate })
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
    setStatus('')
  }

  useEffect(() => {
    const onPopState = () => {
      if (!normalizeCode(window.location.pathname)) goHome()
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const createRoom = async (id: string, code?: string) => {
    const { faces, credit, deck } = await getFaces(id)
    const start = (localStorage.getItem('codenames:start-team') as Team | null) ?? randomTeam()
    try {
      wire(await Host.start(faces, start, credit, deck, code), true)
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
        change.win.byAssassin
          ? 'assassin'
          : change.win.team === myTeam
            ? 'victory'
            : 'gameOver',
      )
      if (change.win.byAssassin) notify(`💀 Assassin! ${teamName(change.win.team)} wins`, change.win.team)
    } else if (change.clueGiven) {
      playSound('clue')
    } else if (change.guessed && change.guessed.outcome === 'correct') {
      playSound('guessRight')
    } else if (change.turnPassed) {
      const wrongGuess = change.guessed && change.guessed.outcome !== 'correct'
      playSound(wrongGuess ? 'guessWrong' : 'endTurn')
      if (change.guessed && change.guessed.outcome !== 'correct') {
        const hit =
          change.guessed.outcome === 'neutral' ? 'a neutral' : `${teamName(change.turnPassed.from)}'s card`
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
    const code = normalizeCode(window.location.pathname)
    if (!code) return

    setStatus(`Joining ${code}…`)
    const saved = sessionStorage.getItem(hostStateKey(code))
    Guest.join(code, { waitForHost: !saved })
      .then((session) => {
        wire(session, false)
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
    attemptJoin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      {game ? (
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
          loadingFaces={loadingFaces}
          providers={providers}
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
          providers={providers}
          onPick={(id) => void createRoom(id, normalizeCode(window.location.pathname) || undefined)}
          onJoin={
            normalizeCode(window.location.pathname)
              ? undefined
              : (raw) => {
                  const code = normalizeCode(raw)
                  if (!code) return
                  history.pushState({}, '', '/' + restoreDash(code))
                  attemptJoin()
                }
          }
        />
      )}
    </>
  )
}
