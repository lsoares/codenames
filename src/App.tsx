import { useEffect, useRef, useState } from 'react'
import { type GameState, type Team } from './game/createGame'
import { type Action } from './game/applyAction'
import { getFaces, providers } from './images/providers'
import { host, resumeHost, join, type Session } from './net/peerMultiplayer'
import { playSound } from './sound'
import GameScreen from './ui/GameScreen'
import Toaster from './ui/Toaster'

const randomTeam = (): Team => (Math.random() < 0.5 ? 'red' : 'blue')

const teamName = (team: Team): string => (team === 'red' ? 'Red' : 'Blue')

const normalizeCode = (raw: string): string =>
  (raw.includes('#') ? raw.slice(raw.lastIndexOf('#') + 1) : raw).trim()

const hostStateKey = (code: string): string => `codenames:host:${code}`

export default function App() {
  const [game, setGame] = useState<GameState | null>(null)
  const [roomCode, setRoomCode] = useState('')
  const [seats, setSeats] = useState<{ red: string | null; blue: string | null }>({
    red: null,
    blue: null,
  })
  const [teams, setTeams] = useState<Record<string, Team>>({})
  const [playerCount, setPlayerCount] = useState(1)
  const [isHost, setIsHost] = useState(false)
  const [status, setStatus] = useState('')
  const [providerId, setProviderId] = useState(
    () => localStorage.getItem('codenames:image-provider') ?? providers[0].id,
  )
  const chooseProvider = (id: string) => {
    localStorage.setItem('codenames:image-provider', id)
    setProviderId(id)
  }
  const sessionRef = useRef<Session | null>(null)
  const isHostRef = useRef(false)
  const startedRef = useRef(false)
  const gameRef = useRef<GameState | null>(null)
  const peersRef = useRef<string[]>([])
  const selfIdRef = useRef('')
  const roomCodeRef = useRef('')
  const [toasts, setToasts] = useState<Array<{ id: number; text: string }>>([])
  const toastIdRef = useRef(0)

  const notify = (text: string) => {
    const id = (toastIdRef.current += 1)
    setToasts((current) => [...current, { id, text }])
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3000)
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
      gameRef.current = view.state
      peersRef.current = view.peers
      setGame(view.state)
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
      const state = gameRef.current
      if (!state || isHostRef.current) return
      try {
        wire(await resumeHost(roomCodeRef.current, state), true)
        playSound('takeover')
        notify('You took over as host')
      } catch {
        try {
          wire(await join(roomCodeRef.current), false)
          playSound('takeover')
          notify('Host recovered — reconnected')
        } catch {
          setStatus('Lost connection to the room.')
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
    const { faces, mode } = await getFaces(id)
    sessionRef.current?.dispatch({ type: 'newGame', faces, mode })
  }

  const claimSeat = (team: Team | null) => {
    sessionRef.current?.setSpymaster(team)
    if (team) {
      playSound('spymaster')
      notify(`You are the ${team} spymaster 🕵️`)
    }
  }

  const createRoom = async () => {
    setStatus('Loading cards…')
    const { faces, mode } = await getFaces(providerId)
    setStatus('Creating room…')
    // Tests can pin the starting team for determinism; players get a random one.
    const start = (localStorage.getItem('codenames:start-team') as Team | null) ?? randomTeam()
    try {
      wire(await host(faces, start, mode), true)
      setStatus('')
    } catch (error) {
      console.error('createRoom failed:', error)
      setStatus(
        `Could not create room (${(error as { type?: string })?.type ?? (error as Error)?.message ?? 'unknown'}). Try again.`,
      )
    }
  }


  // Play a cue whenever the shared state crosses a milestone: new game, clue
  // given, a wrong guess, a turn ending, or a win. Runs on every peer.
  const prevGameRef = useRef<GameState | null>(null)
  useEffect(() => {
    const prev = prevGameRef.current
    prevGameRef.current = game
    if (!game || !prev) return
    // The log only ever grows within a game; a shorter log means a fresh deal.
    if (game.log.length < prev.log.length) {
      playSound('newGame')
      notify(`New game — ${teamName(game.turn)} starts 🔀`)
      return
    }
    // The one card revealed since the last state — the guess that just landed.
    const guessed = game.cards.find((card, index) => card.revealed && !prev.cards[index].revealed)
    if (!prev.winner && game.winner) {
      playSound('gameOver')
      notify(
        guessed?.color === 'assassin'
          ? `💀 Assassin! ${teamName(game.winner)} wins`
          : `${teamName(game.winner)} team wins!`,
      )
    } else if (prev.phase === 'clue' && game.phase === 'guess') {
      playSound('clue')
      notify(`Clue: ${game.clue?.word} · ${game.clue?.count}`)
    } else if (prev.turn !== game.turn) {
      playSound('endTurn')
      // A wrong guess (revealing a neutral or the rivals' card) flips the turn;
      // say why, so the pass doesn't look like it came out of nowhere.
      if (guessed && guessed.color !== prev.turn) {
        const hit = guessed.color === 'neutral' ? 'a neutral' : `${teamName(prev.turn)}'s card`
        notify(`${teamName(prev.turn)} hit ${hit} — ${teamName(game.turn)}'s turn`)
      } else {
        notify(`${teamName(game.turn)}'s turn`)
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

  // As host, mirror the game into sessionStorage so a refresh can restore it.
  useEffect(() => {
    if (isHostRef.current && roomCode && game) {
      sessionStorage.setItem(hostStateKey(roomCode), JSON.stringify(game))
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
        resumeHost(code, JSON.parse(saved) as GameState)
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
          state={game}
          status={status}
          isHost={isHost}
          mySeat={mySeat}
          myTeam={myTeam}
          seats={seats}
          playerCount={playerCount}
          onClaimSeat={claimSeat}
          onAction={(action: Action) => sessionRef.current?.dispatch(action)}
          onNewGame={newGame}
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
      <Toaster toasts={toasts} />
    </>
  )
}
