import { useEffect, useRef, useState } from 'react'
import { type GameState, type Team } from './game/createGame'
import { type Action } from './game/applyAction'
import { fetchPhotos } from './images/unsplash'
import { placeholderImages } from './images/placeholder'
import { host, resumeHost, join, type Session } from './net/peerMultiplayer'
import { playSound } from './sound'
import GameScreen from './ui/GameScreen'

const randomTeam = (): Team => (Math.random() < 0.5 ? 'red' : 'blue')

const normalizeCode = (raw: string): string =>
  (raw.includes('#') ? raw.slice(raw.lastIndexOf('#') + 1) : raw).trim()

const hostStateKey = (code: string): string => `codenames:host:${code}`

export default function App() {
  const [game, setGame] = useState<GameState | null>(null)
  const [roomCode, setRoomCode] = useState('')
  const [spymaster, setSpymaster] = useState(false)
  const [spymasterCount, setSpymasterCount] = useState(0)
  const [playerCount, setPlayerCount] = useState(1)
  const [isHost, setIsHost] = useState(false)
  const [status, setStatus] = useState('')
  const sessionRef = useRef<Session | null>(null)
  const isHostRef = useRef(false)
  const startedRef = useRef(false)
  const gameRef = useRef<GameState | null>(null)
  const peersRef = useRef<string[]>([])
  const selfIdRef = useRef('')
  const roomCodeRef = useRef('')

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
      setSpymasterCount(view.spymasters)
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
      } catch {
        try {
          wire(await join(roomCodeRef.current), false)
          playSound('takeover')
        } catch {
          setStatus('Lost connection to the room.')
        }
      }
    }, delay)
  }

  const toggleSpymaster = (value: boolean) => {
    setSpymaster(value)
    sessionRef.current?.setSpymaster(value)
  }

  const createRoom = async () => {
    setStatus('Loading photos…')
    let images: string[]
    try {
      images = await fetchPhotos()
    } catch {
      images = placeholderImages()
    }
    setStatus('Creating room…')
    try {
      wire(await host(images, randomTeam()), true)
      setStatus('')
    } catch {
      setStatus('Could not create room. Try again.')
    }
  }

  const joinRoom = async (raw: string) => {
    const code = normalizeCode(raw)
    if (!code) return
    setStatus('Connecting…')
    try {
      wire(await join(code), false)
      setStatus('')
    } catch {
      setStatus('Could not connect. Check the room code or link.')
    }
  }

  // Play a cue whenever the shared state crosses a milestone: clue given,
  // a team's turn ends, or the game is won. Runs on every peer.
  const prevGameRef = useRef<GameState | null>(null)
  useEffect(() => {
    const prev = prevGameRef.current
    prevGameRef.current = game
    if (!game || !prev) return
    if (!prev.winner && game.winner) playSound('gameOver')
    else if (prev.phase === 'clue' && game.phase === 'guess') playSound('clue')
    else if (prev.turn !== game.turn) playSound('endTurn')
  }, [game])

  // As host, mirror the game into sessionStorage so a refresh can restore it.
  useEffect(() => {
    if (isHostRef.current && roomCode && game) {
      sessionStorage.setItem(hostStateKey(roomCode), JSON.stringify(game))
    }
  }, [game, roomCode])

  // On load: join/restore the room in the URL hash, or start a fresh game.
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    const code = normalizeCode(window.location.hash)
    if (!code) {
      void createRoom()
      return
    }

    const saved = sessionStorage.getItem(hostStateKey(code))
    if (saved) {
      setStatus('Restoring your room…')
      resumeHost(code, JSON.parse(saved) as GameState)
        .then((session) => {
          wire(session, true)
          setStatus('')
        })
        .catch(() => setStatus('Could not restore the room.'))
    } else {
      void joinRoom(code)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!game) {
    return (
      <main className="card">
        <h1>Codenames Pictures</h1>
        <p>{status || 'Setting up your game…'}</p>
      </main>
    )
  }

  return (
    <GameScreen
      state={game}
      status={status}
      isHost={isHost}
      spymaster={spymaster}
      spymasterCount={spymasterCount}
      playerCount={playerCount}
      onToggleSpymaster={toggleSpymaster}
      onAction={(action: Action) => sessionRef.current?.dispatch(action)}
      onNewGame={() => sessionRef.current?.dispatch({ type: 'newGame' })}
    />
  )
}
