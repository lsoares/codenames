import { useEffect, useRef, useState } from 'react'
import { type GameState, type Team } from './game/createGame'
import { type Action } from './game/applyAction'
import { fetchPhotos } from './images/unsplash'
import { placeholderImages } from './images/placeholder'
import { host, join, type Session } from './net/peerMultiplayer'
import Lobby from './ui/Lobby'
import GameScreen from './ui/GameScreen'

const randomTeam = (): Team => (Math.random() < 0.5 ? 'red' : 'blue')

const normalizeCode = (raw: string): string =>
  (raw.includes('#') ? raw.slice(raw.lastIndexOf('#') + 1) : raw).trim()

export default function App() {
  const [game, setGame] = useState<GameState | null>(null)
  const [roomCode, setRoomCode] = useState('')
  const [spymaster, setSpymaster] = useState(false)
  const [status, setStatus] = useState('')
  const sessionRef = useRef<Session | null>(null)
  const startedRef = useRef(false)

  const wire = (session: Session) => {
    sessionRef.current = session
    setRoomCode(session.roomCode)
    window.location.hash = session.roomCode
    session.subscribe(setGame)
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
      wire(await host(images, randomTeam()))
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
      wire(await join(code))
      setStatus('')
    } catch {
      setStatus('Could not connect. Check the room code or link.')
    }
  }

  // Opening a shared #room link auto-joins that room.
  useEffect(() => {
    if (startedRef.current) return
    const code = normalizeCode(window.location.hash)
    if (!code) return
    startedRef.current = true
    void joinRoom(code)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!game) {
    return <Lobby status={status} onCreate={createRoom} onJoin={joinRoom} />
  }

  return (
    <GameScreen
      state={game}
      roomCode={roomCode}
      spymaster={spymaster}
      onToggleSpymaster={setSpymaster}
      onAction={(action: Action) => sessionRef.current?.dispatch(action)}
      onNewGame={() => {
        window.location.hash = ''
        window.location.reload()
      }}
    />
  )
}
