import { useEffect, useRef, useState } from 'react'
import { Game, type GameState, type Team } from './Game'
import { getFaces, providers } from './cardProviders/providers'
import { Host } from './multiplayer/Host'
import { Guest, JoinError } from './multiplayer/Guest'
import type { Session, Action, Player } from './multiplayer/Session'
import { playSound } from './sound'
import GameScreen from './ui/GameScreen'
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

// Turn a failed join into advice the player can act on: a missing room, an
// unreachable broker, and a blocked peer link have different remedies. Every
// message starts with "Could not" so the status screen offers Retry / New game.
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
  // While the next board's faces are being fetched, blank the current cards so
  // their now-stale images don't linger — the new ones can take a moment.
  const [loadingFaces, setLoadingFaces] = useState(false)
  const [status, setStatus] = useState('')
  const sessionRef = useRef<Session | null>(null)
  const isHostRef = useRef(false)
  const startedRef = useRef(false)
  const gameRef = useRef<Game | null>(null)
  const peersRef = useRef<string[]>([])
  const selfIdRef = useRef('')
  const roomCodeRef = useRef('')
  // A transient message shown in the header status pill, then it reverts to the
  // live status. Replaces separate toast popups — one message zone for both.
  const [flash, setFlash] = useState<string | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // A sticky message holds until the next one replaces it — for a terminal state
  // like a win, whose announcement now lives in this one message zone (no longer
  // a separate banner) and so must stay put rather than fade after a few seconds.
  const notify = (text: string, sticky = false) => {
    setFlash(text)
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
  }

  // Host gone: the surviving peer with the smallest id re-hosts the same room
  // from the state everyone already holds; the others reconnect to it. No UI.
  const migrate = () => {
    if (isHostRef.current) return
    const deadHost = peersRef.current[0]
    const survivors = peersRef.current.filter((id) => id !== deadHost).sort()
    const rank = survivors.indexOf(selfIdRef.current)
    const delay = (rank < 0 ? survivors.length : rank) * 1500
    window.setTimeout(async () => {
      const game = gameRef.current
      if (!game || isHostRef.current) return
      // Drop our old peer before reconnecting, so we don't linger as a second
      // live peer — and so a guest can reclaim its (now-freed) tab id.
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
          // Couldn't re-host or rejoin: drop to the error screen so the player can
          // retry the connection (or start over) rather than sit on a dead board.
          setGame(null)
          setStatus('Lost connection to the room.')
        }
      }
    }, delay)
  }

  const mySeat: Team | null =
    seats.red === selfIdRef.current ? 'red' : seats.blue === selfIdRef.current ? 'blue' : null
  // My team drives the background and who may play: a spymaster follows their
  // seat, everyone else the auto-assigned team.
  const myTeam: Team = mySeat ?? players.find((player) => player.id === selfIdRef.current)?.team ?? 'red'

  // Re-deal the current room from a chosen deck. A deliberate new game rotates
  // each team's spymaster to the next member; an auto re-deal leaves seats as they
  // are.
  const newGame = async (id: string, rotate = false) => {
    setLoadingFaces(true)
    try {
      const { faces, credit, fit, deck } = await getFaces(id)
      sessionRef.current?.dispatch({ type: 'newGame', faces, credit, fit, deck, rotate })
    } finally {
      setLoadingFaces(false)
    }
  }

  const claimSeat = (team: Team | null) => {
    sessionRef.current?.setSpymaster(team)
    // No toast: taking the seat reveals every card's colour to you (and plays a
    // sound) — confirmation enough. Joining likewise recolours the whole page.
    if (team) playSound('spymaster')
  }

  const joinTeam = (team: Team) => {
    sessionRef.current?.setTeam(team)
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
    prevCountRef.current = null
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

  // The room code lives in the URL path, so browser Back (path → '/') returns
  // to the homepage deck picker.
  useEffect(() => {
    const onPopState = () => {
      if (!normalizeCode(window.location.pathname)) goHome()
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const createRoom = async (id: string, code?: string) => {
    // No loading screen: hosting is quick, so stay on the homepage until the
    // board is ready rather than flashing an intermediate card. Only a failure
    // surfaces a status (below).
    const { faces, credit, fit, deck } = await getFaces(id)
    // Tests can pin the starting team for determinism; players get a random one.
    const start = (localStorage.getItem('codenames:start-team') as Team | null) ?? randomTeam()
    try {
      wire(await Host.start(faces, start, credit, fit, deck, code), true)
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


  // Play a cue whenever the shared game crosses a milestone: new game, clue
  // given, a wrong guess, a turn ending, or a win. Runs on every peer.
  const prevGameRef = useRef<Game | null>(null)
  useEffect(() => {
    const prev = prevGameRef.current
    prevGameRef.current = game
    if (!game || !prev) return
    const change = game.changesFrom(prev)
    if (change.newGame) {
      playSound('newGame')
      notify(`New game — ${teamName(game.state.turn)} starts 🔀`)
      return
    }
    if (change.win) {
      playSound('gameOver')
      // The win itself now rides the persistent status line (viewer-aware, with
      // your team's faces when you win), so no transient copy duplicates it. Only
      // the assassin's sudden end still earns a brief call-out.
      if (change.win.byAssassin) notify(`💀 Assassin! ${teamName(change.win.team)} wins`)
    } else if (change.clueGiven) {
      playSound('clue')
    } else if (change.turnPassed) {
      playSound('endTurn')
      // Only a pass caused by a wrong guess needs words — say why, so it doesn't
      // look like it came from nowhere. A clean pass is already clear from the
      // persistent turn line, so no transient copy of it.
      if (change.guessed && change.guessed.outcome !== 'correct') {
        const hit =
          change.guessed.outcome === 'neutral' ? 'a neutral' : `${teamName(change.turnPassed.from)}'s card`
        notify(`${teamName(change.turnPassed.from)} hit ${hit} — ${teamName(change.turnPassed.to)}'s turn`)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game])

  // Announce peers arriving and leaving so the room's size never changes
  // silently. No sound — connections churn during host recovery. Gate on being
  // in a room so a joiner's own arrival — the jump from the empty default to the
  // room's real headcount — is a silent baseline, not a phantom "player joined".
  const prevCountRef = useRef<number | null>(null)
  useEffect(() => {
    if (!game) return
    const prev = prevCountRef.current
    prevCountRef.current = players.length
    if (prev === null || players.length === prev) return
    notify(players.length > prev ? 'A player joined 👋' : 'A player left')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players.length, game])

  // Announce to everyone else when a team gets a new spymaster. The claimer
  // already got their own toast in claimSeat, so skip the seat we now hold.
  // Gate on being in a room so the very first real view is only a baseline:
  // without it the mount run seeds prev from the default empty seats, and a
  // joiner would then hear every already-seated spymaster announced as "new".
  const prevSeatsRef = useRef<typeof seats | null>(null)
  useEffect(() => {
    if (!game) return
    const prev = prevSeatsRef.current
    prevSeatsRef.current = seats
    if (!prev) return
    for (const team of ['red', 'blue'] as const) {
      if (seats[team] && seats[team] !== prev[team] && seats[team] !== selfIdRef.current) {
        playSound('spymaster')
        notify(`New ${team} spymaster 🕵️`)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seats, game])

  useEffect(() => {
    if (isHostRef.current && roomCode && game) {
      sessionStorage.setItem(hostStateKey(roomCode), JSON.stringify(game.state))
    }
  }, [game, roomCode])


  // Join the live room in the URL path if one exists — this also keeps a
  // duplicated tab (which inherits the host's saved state) from re-hosting. Only
  // re-host from saved state when nobody answers, so a host's own refresh still
  // recovers. No room in the path ⇒ start a fresh game. Pulled out of the mount
  // effect so the failure screen can retry it.
  const attemptJoin = () => {
    const code = normalizeCode(window.location.pathname)
    if (!code) return // no room in the URL: land on the homepage instead

    setStatus('Entering the room…')
    // Guest.join owns the deadline: it retries transient failures for the whole
    // join window, then rejects with a JoinError naming what went wrong. The
    // reloading host's own tab keeps a copy of the room state; there the join
    // must not wait out the window on a missing room (waitForHost: false) — its
    // next move is to re-host below, and that path recovers in a beat.
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
        setStatus('Getting your room back…')
        Host.resume(code, JSON.parse(saved) as GameState)
          .then((session) => {
            wire(session, true)
            setStatus('')
          })
          .catch(() => setStatus('Could not get your room back.'))
      })
  }

  // On load: run the join/restore once.
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
          seats={seats}
          players={players}
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
        />
      )}
    </>
  )
}
