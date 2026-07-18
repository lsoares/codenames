import { useEffect, useRef, useState } from 'react'
import { ArenaGame, createArenaGame } from './Game'
import { ArenaHost } from './Host'
import { ArenaGuest } from './Guest'
import { AiSetup } from './ai/AiSetup'
import { getApiKey } from './ai/keyStore'
import { StatusBanner } from '../components/StatusBanner'
import { SoloGameScreen } from './Screen'
import { SpymasterSoloGameScreen } from './SpymasterScreen'
import { findDeck } from '../decks'
import type { ArenaView, ArenaScoreEntry } from './messages'

export function ArenaApp(props: { code?: string }) {
  const [arenaMode, setArenaMode] = useState<'operative' | 'spymaster'>('operative')
  const [arenaGame, setArenaGame] = useState<ArenaGame | null>(null)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [needsApiKey, setNeedsApiKey] = useState(false)
  const [scoreboard, setScoreboard] = useState<ArenaScoreEntry[]>([])
  const [arenaWinner, setArenaWinner] = useState<string | null>(null)
  const [selfId, setSelfId] = useState('')
  const [status, setStatus] = useState('')
  const hostRef = useRef<ArenaHost | null>(null)
  const guestRef = useRef<ArenaGuest | null>(null)
  const gameRef = useRef<ArenaGame | null>(null)
  const clueIndexRef = useRef(0)
  const startedRef = useRef(false)

  const goHome = () => {
    hostRef.current?.close()
    guestRef.current?.close()
    hostRef.current = null
    guestRef.current = null
    history.pushState({}, '', '/')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const applyView = (view: ArenaView) => {
    setScoreboard(view.scoreboard)
    setArenaWinner(view.winner)

    if (!gameRef.current) {
      const cards = view.board.faces.map((face, i) => ({
        face,
        color: view.board.colors[i],
        revealed: false,
        markedBy: [] as ('red' | 'blue')[],
        outcome: null,
      }))
      const state = {
        cards,
        deck: view.board.deck,
        credit: null,
        clue: null,
        clueHistory: [],
        guessesRemaining: 0,
        result: 'playing' as const,
      }
      const game = new ArenaGame(state)
      gameRef.current = game
      setArenaGame(game)
      clueIndexRef.current = 0
    }

    const game = gameRef.current!
    while (clueIndexRef.current < view.clueHistory.length) {
      const clue = view.clueHistory[clueIndexRef.current]
      if (game.state.clue === null && game.state.result === 'playing') {
        const next = game.receiveClue(clue.word, clue.count, clue.targets as string[] | undefined)
        gameRef.current = next
        setArenaGame(next)
      }
      clueIndexRef.current++
    }
  }

  const reportScore = () => {
    const game = gameRef.current
    if (!game) return
    const found = game.mineCount() - game.unrevealedMineCount()
    const dead = game.state.result === 'dead'
    if (hostRef.current) hostRef.current.updateScore(found, dead)
    if (guestRef.current) guestRef.current.sendScore(found, dead)
  }

  const joinAsGuest = async (code: string) => {
    setStatus(`Joining ${code}...`)
    try {
      const guest = await ArenaGuest.join(code)
      guestRef.current = guest
      setSelfId(guest.selfId)
      guest.subscribe((view) => {
        setStatus('')
        applyView(view)
      })
      guest.onDisconnect(() => setStatus('Lost connection.'))
    } catch {
      setStatus('Could not join arena.')
    }
  }

  const startLocal = async () => {
    const key = await getApiKey()
    if (!key) {
      setNeedsApiKey(true)
      return
    }
    setApiKey(key)
    const deck = findDeck('Words')
    const faces = await deck.fetch(20)
    const game = new ArenaGame(createArenaGame(faces, deck.title, null, '5x4'))
    gameRef.current = game
    setArenaGame(game)
  }

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    if (props.code) {
      void joinAsGuest(props.code)
    } else {
      void startLocal()
    }
    return () => {
      hostRef.current?.close()
      guestRef.current?.close()
    }
  }, [])

  const onApiKeyReady = async (key: string) => {
    setApiKey(key)
    setNeedsApiKey(false)
    void startLocal()
  }

  const handleGameUpdate = (game: ArenaGame) => {
    gameRef.current = game
    setArenaGame(game)

    const prevClue = gameRef.current?.state.clue
    if (game.state.clue === null && prevClue !== null && game.state.result === 'playing') {
      if (hostRef.current) void hostRef.current.requestNextClue()
    }

    reportScore()
  }

  if (needsApiKey) return <AiSetup onReady={onApiKeyReady} />

  if (status)
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
        <StatusBanner text={status} />
      </div>
    )

  if (arenaGame && arenaMode === 'operative') {
    return (
      <SoloGameScreen
        game={arenaGame}
        apiKey={apiKey ?? ''}
        onGameUpdate={handleGameUpdate}
        onNewGame={async () => {
          setArenaMode('spymaster')
          gameRef.current = null
          clueIndexRef.current = 0
          setArenaGame(null)
          void startLocal()
        }}
        onSwitchRole={async () => {
          setArenaMode('spymaster')
          gameRef.current = null
          clueIndexRef.current = 0
          setArenaGame(null)
          void startLocal()
        }}
        onHome={goHome}
        scoreboard={scoreboard.length > 1 ? scoreboard : undefined}
        selfId={selfId}
        arenaWinner={arenaWinner}
        externalClues={!!hostRef.current || !!guestRef.current}
      />
    )
  }

  if (arenaGame && arenaMode === 'spymaster') {
    return (
      <SpymasterSoloGameScreen
        game={arenaGame}
        apiKey={apiKey ?? ''}
        onGameUpdate={handleGameUpdate}
        onNewGame={async () => {
          setArenaMode('operative')
          gameRef.current = null
          clueIndexRef.current = 0
          setArenaGame(null)
          void startLocal()
        }}
        onSwitchRole={async () => {
          setArenaMode('operative')
          gameRef.current = null
          clueIndexRef.current = 0
          setArenaGame(null)
          void startLocal()
        }}
        onHome={goHome}
      />
    )
  }

  return null
}
