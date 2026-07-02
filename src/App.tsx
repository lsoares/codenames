import { useState } from 'react'
import { createGame, type GameState, type Team } from './game/createGame'
import { applyAction, type Action } from './game/applyAction'
import { placeholderImages } from './images/placeholder'
import Lobby from './ui/Lobby'
import GameScreen from './ui/GameScreen'

const randomTeam = (): Team => (Math.random() < 0.5 ? 'red' : 'blue')

export default function App() {
  const [game, setGame] = useState<GameState | null>(null)
  const [spymaster, setSpymaster] = useState(false)

  if (!game) {
    return (
      <Lobby
        status=""
        onCreate={() => setGame(createGame(placeholderImages(), randomTeam()))}
        onJoin={() => {}}
      />
    )
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
