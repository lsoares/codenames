import { useState } from 'react'
import { createGame, type GameState, type Team } from './game/createGame'
import { applyAction, type Action } from './game/applyAction'
import { fetchPhotos } from './images/unsplash'
import { placeholderImages } from './images/placeholder'
import Lobby from './ui/Lobby'
import GameScreen from './ui/GameScreen'

const randomTeam = (): Team => (Math.random() < 0.5 ? 'red' : 'blue')

export default function App() {
  const [game, setGame] = useState<GameState | null>(null)
  const [spymaster, setSpymaster] = useState(false)
  const [status, setStatus] = useState('')

  const startGame = async () => {
    setStatus('Loading photos…')
    let images: string[]
    try {
      images = await fetchPhotos()
    } catch {
      images = placeholderImages()
    }
    setGame(createGame(images, randomTeam()))
    setStatus('')
  }

  if (!game) {
    return <Lobby status={status} onCreate={startGame} onJoin={() => {}} />
  }

  return (
    <GameScreen
      state={game}
      spymaster={spymaster}
      onToggleSpymaster={setSpymaster}
      onAction={(action: Action) =>
        setGame((current) => (current ? applyAction(current, action) : current))
      }
      onNewGame={() => {
        setGame(null)
        setSpymaster(false)
      }}
    />
  )
}
