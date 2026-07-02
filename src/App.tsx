import { useEffect, useRef, useState } from 'react'
import { type GameState, type Team } from './game/createGame'
import { type Action } from './game/applyAction'
import { fetchPhotos } from './images/unsplash'
import { placeholderImages } from './images/placeholder'
import { host, resumeHost, join, type Session } from './net/peerMultiplayer'
import Lobby from './ui/Lobby'
import GameScreen from './ui/GameScreen'

const randomTeam = (): Team => (Math.random() < 0.5 ? 'red' : 'blue')

const normalizeCode = (raw: string): string =>
  (raw.includes('#') ? raw.slice(raw.lastIndexOf('#') + 1) : raw).trim()

const hostStateKey = (code: string): string => `codenames:host:${code}`

export default function App() {
  const [game, setGame] = useState<GameState | null>(null)
  const [roomCode, setRoomCode] = useState('')
  const [spymaster, setSpymaster] = useState(false)
  const [status, setStatus] = useState('')
  const sessionRef = useRef<Session | null>(null)
  const isHostRef = useRef(false)
  const startedRef = useRef(false)

  const wire = (session: Session, asHost: boolean) => {
    sessionRef.current = session
    isHostRef.current = asHost
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

  // As host, mirror the game into sessionStorage so a refresh can restore it.
  useEffect(() => {
    if (isHostRef.current && roomCode && game) {
      sessionStorage.setItem(hostStateKey(roomCode), JSON.stringify(game))
    }
  }, [game, roomCode])

  // On load, restore a room from the URL hash: re-host if we saved it, else join.
  useEffect(() => {
    if (startedRef.current) return
    const code = normalizeCode(window.location.hash)
    if (!code) return
    startedRef.current = true

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
        sessionStorage.removeItem(hostStateKey(roomCode))
        window.location.hash = ''
        window.location.reload()
      }}
    />
  )
}
