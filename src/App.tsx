import { useEffect, useRef, useState } from 'react'
import { Game, type GameState, type Team } from './Game'
import { getFaces, providers } from './images/providers'
import { Host } from './Host'
import { join } from './peerMultiplayer'
import type { Session, Action } from './Session'
import { playSound } from './sound'
import GameScreen from './ui/GameScreen'

const randomTeam = (): Team => (Math.random() < 0.5 ? 'red' : 'blue')

const teamName = (team: Team): string => (team === 'red' ? 'Red' : 'Blue')

const normalizeCode = (raw: string): string =>
  (raw.includes('#') ? raw.slice(raw.lastIndexOf('#') + 1) : raw).trim()

const hostStateKey = (code: string): string => `codenames:host:${code}`

export default function App() {
  const [game, setGame] = useState<Game | null>(null)
  const [roomCode, setRoomCode] = useState('')
  const [seats, setSeats] = useState<{ red: string | null; blue: string | null }>({
    red: null,
    blue: null,
  })
  const [teams, setTeams] = useState<Record<string, Team>>({})
  const [playerCount, setPlayerCount] = useState(1)
  const [isHost, setIsHost] = useState(false)
  // While the next board's faces are being fetched, blank the current cards so
  // their now-stale images don't linger — the new ones can take a moment.
  const [loadingFaces, setLoadingFaces] = useState(false)
  const [status, setStatus] = useState('')
  // Words leads the menu, but the board that auto-loads is Unsplash (it falls
  // back to Words when there's no key), so first-time players open onto photos.
  const [providerId, setProviderId] = useState(
    () => localStorage.getItem('codenames:image-provider') ?? 'unsplash',
  )
  const chooseProvider = (id: string) => {
    localStorage.setItem('codenames:image-provider', id)
    setProviderId(id)
  }
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
    window.location.hash = session.roomCode
    session.subscribe((view) => {
      const next = new Game(view.state)
      gameRef.current = next
      peersRef.current = view.peers
      setGame(next)
      setSeats(view.seats)
      setTeams(view.teams ?? {})
      setPlayerCount(view.peers.length)
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
      try {
        wire(await Host.resume(roomCodeRef.current, game.state), true)
        playSound('takeover')
        notify('You took over as host')
      } catch {
        try {
          wire(await join(roomCodeRef.current), false)
          playSound('takeover')
          notify('Host recovered — reconnected')
        } catch {
          // Losing the room mid-game is terminal for this tab; hold it in the one
          // message zone (sticky) rather than a separate in-header line.
          notify('Lost connection to the room.', true)
        }
      }
    }, delay)
  }

  const mySeat: Team | null =
    seats.red === selfIdRef.current ? 'red' : seats.blue === selfIdRef.current ? 'blue' : null
  // My team drives the background and who may play: a spymaster follows their
  // seat, everyone else the auto-assigned team.
  const myTeam: Team = mySeat ?? teams?.[selfIdRef.current] ?? 'red'

  const newGame = async (id: string = providerId) => {
    setLoadingFaces(true)
    try {
      const { faces, mode } = await getFaces(id)
      sessionRef.current?.dispatch({ type: 'newGame', faces, mode })
    } finally {
      setLoadingFaces(false)
    }
  }

  const claimSeat = (team: Team | null) => {
    sessionRef.current?.setSpymaster(team)
    if (team) {
      playSound('spymaster')
      notify(`You are the ${team} spymaster 🕵️`)
    }
  }

  const joinTeam = (team: Team) => {
    sessionRef.current?.setTeam(team)
    notify(`You joined ${team} ${team === 'red' ? '🔴' : '🔵'}`)
  }

  const createRoom = async () => {
    setStatus('Loading cards…')
    const { faces, mode } = await getFaces(providerId)
    setStatus('Creating room…')
    // Tests can pin the starting team for determinism; players get a random one.
    const start = (localStorage.getItem('codenames:start-team') as Team | null) ?? randomTeam()
    try {
      wire(await Host.start(faces, start, mode), true)
      setStatus('')
    } catch (error) {
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
      notify(
        change.win.byAssassin
          ? `💀 Assassin! ${teamName(change.win.team)} team wins`
          : `🏆 ${teamName(change.win.team)} team wins!`,
        true,
      )
    } else if (change.clueGiven) {
      playSound('clue')
      notify(`Clue: ${change.clueGiven.word} · ${change.clueGiven.count}`)
    } else if (change.turnPassed) {
      playSound('endTurn')
      // A wrong guess (a neutral or the rivals' card) flips the turn; say why, so
      // the pass doesn't look like it came out of nowhere.
      if (change.guessed && change.guessed.outcome !== 'correct') {
        const hit =
          change.guessed.outcome === 'neutral' ? 'a neutral' : `${teamName(change.turnPassed.from)}'s card`
        notify(`${teamName(change.turnPassed.from)} hit ${hit} — ${teamName(change.turnPassed.to)}'s turn`)
      } else {
        notify(`${teamName(change.turnPassed.to)}'s turn`)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game])

  // Announce peers arriving and leaving so the room's size never changes
  // silently. No sound — connections churn during host recovery.
  const prevCountRef = useRef<number | null>(null)
  useEffect(() => {
    const prev = prevCountRef.current
    prevCountRef.current = playerCount
    if (prev === null || playerCount === prev) return
    notify(playerCount > prev ? 'A player joined 👋' : 'A player left')
  }, [playerCount])

  // Announce to everyone else when a team gets a new spymaster. The claimer
  // already got their own toast in claimSeat, so skip the seat we now hold.
  const prevSeatsRef = useRef<typeof seats | null>(null)
  useEffect(() => {
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
  }, [seats])

  useEffect(() => {
    if (isHostRef.current && roomCode && game) {
      sessionStorage.setItem(hostStateKey(roomCode), JSON.stringify(game.state))
    }
  }, [game, roomCode])

  // On load: join the live room in the URL hash if one exists — this also keeps
  // a duplicated tab (which inherits the host's saved state) from re-hosting.
  // Only re-host from saved state when nobody answers, so a host's own refresh
  // still recovers. No hash ⇒ start a fresh game.
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    const code = normalizeCode(window.location.hash)
    if (!code) {
      void createRoom()
      return
    }

    setStatus('Connecting…')
    const timeout = new Promise<never>((_, reject) =>
      window.setTimeout(() => reject(new Error('join-timeout')), 3000),
    )
    Promise.race([join(code), timeout])
      .then((session) => {
        wire(session, false)
        setStatus('')
      })
      .catch(() => {
        const saved = sessionStorage.getItem(hostStateKey(code))
        if (!saved) {
          setStatus('Could not connect. Check the room code or link.')
          return
        }
        setStatus('Restoring your room…')
        Host.resume(code, JSON.parse(saved) as GameState)
          .then((session) => {
            wire(session, true)
            setStatus('')
          })
          .catch(() => setStatus('Could not restore the room.'))
      })
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
          teams={teams}
          onClaimSeat={claimSeat}
          onJoinTeam={joinTeam}
          onAction={(action: Action) => sessionRef.current?.dispatch(action)}
          onNewGame={newGame}
          loadingFaces={loadingFaces}
          providers={providers}
          providerId={providerId}
          onProviderChange={chooseProvider}
        />
      ) : (
        <main className="card">
          <h1>Codenames Pictures</h1>
          <p>{status || 'Setting up your game…'}</p>
          {/^(Could not|Lost)/.test(status) && (
            <button
              onClick={() => {
                window.location.hash = ''
                void createRoom()
              }}
            >
              New game
            </button>
          )}
        </main>
      )}
    </>
  )
}
