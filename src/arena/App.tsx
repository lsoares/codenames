import { useEffect, useRef, useState } from 'react'
import { ArenaGame } from './Game'
import { ArenaHost } from './Host'
import { ArenaGuest } from './Guest'
import { AiSetup } from './ai/AiSetup'
import { getApiKey } from './ai/keyStore'
import { StatusBanner } from '../components/StatusBanner'
import { SoloGameScreen } from './Screen'
import { SpymasterSoloGameScreen } from './SpymasterScreen'
import { findDeck } from '../decks'
import { shuffle } from '../shuffle'
import type { CardColor } from '../Card'
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
  const [loadingClue, setLoadingClue] = useState(false)
  const hostRef = useRef<ArenaHost | null>(null)
  const guestRef = useRef<ArenaGuest | null>(null)
  const gameRef = useRef<ArenaGame | null>(null)
  const startedRef = useRef(false)

  const goHome = () => {
    hostRef.current?.close()
    guestRef.current?.close()
    hostRef.current = null
    guestRef.current = null
    history.pushState({}, '', '/')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const getUnrevealedMineWords = (): string[] => {
    const game = gameRef.current
    if (!game) return []
    return game.state.cards
      .filter((c) => c.color === 'blue' && !c.revealed && c.face.kind === 'text')
      .map((c) => (c.face.kind === 'text' ? c.face.text : ''))
      .filter(Boolean)
  }

  const requestClue = async () => {
    const mineWords = getUnrevealedMineWords()
    if (mineWords.length === 0) return
    setLoadingClue(true)
    try {
      let clue
      if (hostRef.current) {
        clue = await hostRef.current.requestClueFor(mineWords)
      } else if (guestRef.current) {
        clue = await guestRef.current.requestClue(mineWords)
      }
      if (
        clue &&
        gameRef.current?.state.clue === null &&
        gameRef.current.state.result === 'playing'
      ) {
        const next = gameRef.current.receiveClue(
          clue.word,
          clue.count,
          clue.targets as string[] | undefined,
        )
        gameRef.current = next
        setArenaGame(next)
      }
    } finally {
      setLoadingClue(false)
    }
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
      const game = new ArenaGame({
        cards,
        deck: view.board.deck,
        credit: null,
        clue: null,
        clueHistory: [],
        guessesRemaining: 0,
        result: 'playing' as const,
      })
      gameRef.current = game
      setArenaGame(game)
      void requestClue()
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

  const startAsHost = async () => {
    const key = await getApiKey()
    if (!key) {
      setNeedsApiKey(true)
      return
    }
    setApiKey(key)
    setStatus('Creating room...')
    const deck = findDeck('Words')
    const faces = await deck.fetch(20)
    const colors = shuffle<CardColor>([
      ...Array<CardColor>(12).fill('blue'),
      ...Array<CardColor>(8).fill('assassin'),
    ])
    const host = await ArenaHost.start(faces, colors, deck.title, key)
    hostRef.current = host
    setSelfId(host.selfId)
    history.replaceState({}, '', '/' + host.roomCode)
    host.subscribe(applyView)
    setStatus('')
  }

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    if (props.code) {
      void joinAsGuest(props.code)
    } else {
      void startAsHost()
    }
    return () => {
      hostRef.current?.close()
      guestRef.current?.close()
    }
  }, [])

  const onApiKeyReady = async (key: string) => {
    setApiKey(key)
    setNeedsApiKey(false)
    void startAsHost()
  }

  const handleGameUpdate = (game: ArenaGame) => {
    const hadClue = gameRef.current?.state.clue !== null
    gameRef.current = game
    setArenaGame(game)

    if (hadClue && game.state.clue === null && game.state.result === 'playing') {
      void requestClue()
    }

    reportScore()
  }

  const restart = async (nextMode: 'operative' | 'spymaster') => {
    setArenaMode(nextMode)
    gameRef.current = null
    setArenaGame(null)
    hostRef.current?.close()
    hostRef.current = null
    void startAsHost()
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
        onNewGame={() => void restart('spymaster')}
        onSwitchRole={() => void restart('spymaster')}
        onHome={goHome}
        scoreboard={scoreboard.length > 1 ? scoreboard : undefined}
        selfId={selfId}
        arenaWinner={arenaWinner}
        externalClues={!!hostRef.current || !!guestRef.current}
        loading={loadingClue}
      />
    )
  }

  if (arenaGame && arenaMode === 'spymaster') {
    return (
      <SpymasterSoloGameScreen
        game={arenaGame}
        apiKey={apiKey ?? ''}
        onGameUpdate={handleGameUpdate}
        onNewGame={() => void restart('operative')}
        onSwitchRole={() => void restart('operative')}
        onHome={goHome}
      />
    )
  }

  return null
}
