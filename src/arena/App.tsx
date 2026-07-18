import { useEffect, useRef, useState } from 'react'
import { ArenaGame, createArenaGame } from './Game'
import { AiSetup } from './ai/AiSetup'
import { getApiKey } from './ai/keyStore'
import { SoloGameScreen } from './Screen'
import { SpymasterSoloGameScreen } from './SpymasterScreen'
import { findDeck, creditOf } from '../decks'

export function ArenaApp(props: { code?: string }) {
  const [arenaMode, setArenaMode] = useState<'operative' | 'spymaster'>('operative')
  const [arenaGame, setArenaGame] = useState<ArenaGame | null>(null)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [needsApiKey, setNeedsApiKey] = useState(false)
  const [pendingSoloDeck, setPendingSoloDeck] = useState<string | null>(null)
  const [selectedBoardSize] = useState<'5x4' | '5x5'>('5x4')
  const startedRef = useRef(false)

  const goHome = () => {
    history.pushState({}, '', '/')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const startArenaGame = async (title: string) => {
    const key = await getApiKey()
    if (!key) {
      setPendingSoloDeck(title)
      setNeedsApiKey(true)
      return
    }
    setApiKey(key)
    const deck = findDeck(title)
    const total = selectedBoardSize === '5x4' ? 20 : 25
    const faces = await deck.fetch(total)
    setArenaGame(
      new ArenaGame(createArenaGame(faces, deck.title, creditOf(deck), selectedBoardSize)),
    )
  }

  const onApiKeyReady = async (key: string) => {
    setApiKey(key)
    setNeedsApiKey(false)
    if (pendingSoloDeck) {
      const title = pendingSoloDeck
      setPendingSoloDeck(null)
      const deck = findDeck(title)
      const total = selectedBoardSize === '5x4' ? 20 : 25
      const faces = await deck.fetch(total)
      setArenaGame(
        new ArenaGame(createArenaGame(faces, deck.title, creditOf(deck), selectedBoardSize)),
      )
    }
  }

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    void startArenaGame(props.code ?? 'Words')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (needsApiKey) {
    return <AiSetup onReady={onApiKeyReady} />
  }

  if (arenaGame && apiKey && arenaMode === 'operative') {
    return (
      <SoloGameScreen
        game={arenaGame}
        apiKey={apiKey}
        onGameUpdate={setArenaGame}
        onNewGame={async () => {
          setArenaMode('spymaster')
          const title = arenaGame.state.deck
          if (title) await startArenaGame(title)
        }}
        onSwitchRole={async () => {
          setArenaMode('spymaster')
          const title = arenaGame.state.deck
          if (title) await startArenaGame(title)
        }}
        onHome={goHome}
      />
    )
  }

  if (arenaGame && apiKey && arenaMode === 'spymaster') {
    return (
      <SpymasterSoloGameScreen
        game={arenaGame}
        apiKey={apiKey}
        onGameUpdate={setArenaGame}
        onNewGame={async () => {
          setArenaMode('operative')
          const title = arenaGame.state.deck
          if (title) await startArenaGame(title)
        }}
        onSwitchRole={async () => {
          setArenaMode('operative')
          const title = arenaGame.state.deck
          if (title) await startArenaGame(title)
        }}
        onHome={goHome}
      />
    )
  }

  return null
}
