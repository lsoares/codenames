import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { SoloGame } from '../SoloGame'
import { fetchClue } from '../ai/groq'
import { playSound } from '../sound'
import type { GuessOutcome } from '../Boardable'
import { Board } from './Board'
import { Confetti } from './Confetti'
import styles from './SoloGameScreen.module.css'

export function SoloGameScreen(props: {
  game: SoloGame
  apiKey: string
  onGameUpdate: (game: SoloGame) => void
  onNewGame: () => void
}) {
  const { clue, clueHistory, guessesRemaining, result } = props.game.state

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadingRef = useRef(false)
  const gameRef = useRef(props.game)
  gameRef.current = props.game

  const requestClue = () => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    setError(null)
    const cards = gameRef.current.state.cards
    const mineWords = cards
      .filter((c) => c.color === 'blue' && !c.revealed && c.face.kind === 'text')
      .map((c) => (c.face.kind === 'text' ? c.face.text : ''))
    const assassinWords = cards
      .filter((c) => c.color === 'assassin' && !c.revealed && c.face.kind === 'text')
      .map((c) => (c.face.kind === 'text' ? c.face.text : ''))
    const revealedWords = cards
      .filter((c) => c.revealed && c.face.kind === 'text')
      .map((c) => (c.face.kind === 'text' ? c.face.text : ''))
    fetchClue({ key: props.apiKey, mineWords, assassinWords, revealedWords })
      .then(({ word, count }) => {
        props.onGameUpdate(gameRef.current.receiveClue(word, count))
        playSound('clue')
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      })
      .finally(() => {
        setLoading(false)
        loadingRef.current = false
      })
  }

  useEffect(() => {
    if (result === 'playing' && clue === null && !loadingRef.current) {
      requestClue()
    }
  }, [result, clue])

  const animate = (update: () => void) => {
    const doc = document as Document & { startViewTransition?: (run: () => void) => void }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!doc.startViewTransition || reduce) return update()
    doc.startViewTransition(() => flushSync(update))
  }

  const handleCardClick = (index: number) => {
    animate(() => {
      const next = props.game.guess(index)
      props.onGameUpdate(next)
    })
  }

  const [feedback, setFeedback] = useState<Record<number, GuessOutcome>>({})
  const prevGameRef = useRef(props.game)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    const prev = prevGameRef.current
    prevGameRef.current = props.game
    const prevCards = prev.state.cards
    const nextCards = props.game.state.cards
    let guessed: { index: number; outcome: GuessOutcome } | null = null
    for (let i = 0; i < nextCards.length; i++) {
      if (!prevCards[i].revealed && nextCards[i].revealed && nextCards[i].outcome) {
        guessed = { index: i, outcome: nextCards[i].outcome as GuessOutcome }
        break
      }
    }
    if (!guessed) return
    const { index, outcome } = guessed
    setFeedback((current) => ({ ...current, [index]: outcome }))
    if (outcome === 'correct') playSound('guessRight')
    if (outcome === 'assassin') playSound('assassin')
    timersRef.current.push(
      setTimeout(() => {
        setFeedback((current) => {
          const next = { ...current }
          delete next[index]
          return next
        })
      }, 1300),
    )
  }, [props.game])

  useEffect(() => () => timersRef.current.forEach(clearTimeout), [])

  const prevResultRef = useRef(result)
  useEffect(() => {
    const prev = prevResultRef.current
    prevResultRef.current = result
    if (prev === result) return
    if (result === 'win') playSound('victory')
    if (result === 'dead') playSound('gameOver')
  }, [result])

  const statusText = () => {
    if (result === 'win') return 'You found all the words!'
    if (result === 'dead') return 'Hit an assassin. Game over.'
    if (loading) return 'AI is thinking...'
    if (error) return error
    if (clue) {
      return (
        <>
          <strong className={styles.clueWord}>{clue.word}</strong>
          <span className={styles.clueCount}>{clue.count}</span>
          {guessesRemaining > 0 && (
            <span className={styles.guessesLeft}>
              {guessesRemaining} guess{guessesRemaining === 1 ? '' : 'es'} left
            </span>
          )}
        </>
      )
    }
    return null
  }

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <span className={styles.score}>
          {props.game.unrevealedMineCount()} / {props.game.mineCount()}
        </span>
        <span className={styles.status} role="status">
          {statusText()}
        </span>
        {result !== 'playing' && (
          <button type="button" className={styles.playAgain} onClick={props.onNewGame}>
            Play again
          </button>
        )}
        {result === 'playing' && error && (
          <button type="button" className={styles.retry} onClick={requestClue}>
            Retry
          </button>
        )}
      </header>

      <div className={styles.boardArea}>
        <Board
          game={props.game}
          loading={loading && clueHistory.length === 0}
          spymasterTeam={null}
          myTeam="blue"
          selected={new Set()}
          focus={false}
          feedback={feedback}
          onToggleSelect={() => {}}
          onClearSelection={() => {}}
          onCardClick={handleCardClick}
          onCardMark={() => {}}
        />
      </div>

      {result === 'win' && <Confetti />}
    </main>
  )
}
