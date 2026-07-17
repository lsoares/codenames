import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { SoloGame } from '../SoloGame'
import { fetchGuess } from '../ai/groq'
import { playSound } from '../sound'
import type { GuessOutcome } from '../Boardable'
import { Board } from './Board'
import { ClueBar } from './ClueBar'
import { ClueDisplay } from './ClueDisplay'
import { Confetti } from './Confetti'
import styles from './SpymasterSoloGameScreen.module.css'

export function SpymasterSoloGameScreen(props: {
  game: SoloGame
  apiKey: string
  onGameUpdate: (game: SoloGame) => void
  onNewGame: () => void
  onSwitchRole?: () => void
}) {
  const { clue, clueHistory, guessesRemaining, result } = props.game.state

  const [aiGuessing, setAiGuessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const cancelRef = useRef(false)

  const animate = (update: () => void) => {
    const doc = document as Document & { startViewTransition?: (run: () => void) => void }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!doc.startViewTransition || reduce) return update()
    doc.startViewTransition(() => flushSync(update))
  }

  const toggleSelected = (index: number) => {
    animate(() =>
      setSelected((prev) => {
        const next = new Set(prev)
        next.has(index) ? next.delete(index) : next.add(index)
        return next
      }),
    )
  }

  const handleClue = async (word: string, count: number) => {
    const withClue = props.game.receiveClue(word, count)
    props.onGameUpdate(withClue)
    setSelected(new Set())
    setAiGuessing(true)
    setError(null)
    cancelRef.current = false
    playSound('clue')

    try {
      let current = withClue
      for (let i = 0; i < count; i++) {
        if (cancelRef.current || current.state.result !== 'playing') break
        const words = current.state.cards
          .filter((c) => !c.revealed && c.face.kind === 'text')
          .map((c) => (c.face.kind === 'text' ? c.face.text : ''))
          .filter(Boolean)
        const guess = await fetchGuess({ key: props.apiKey, clue: word, count, words })
        if (cancelRef.current) break
        await new Promise((resolve) => setTimeout(resolve, 1000))
        if (cancelRef.current) break
        const cardIndex = current.state.cards.findIndex(
          (c) => !c.revealed && c.face.kind === 'text' && c.face.text.toUpperCase() === guess,
        )
        if (cardIndex < 0) continue
        current = current.guess(cardIndex)
        animate(() => props.onGameUpdate(current))
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setAiGuessing(false)
    }
  }

  useEffect(() => {
    return () => { cancelRef.current = true }
  }, [])

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

  const showClueBar = result === 'playing' && !clue && !aiGuessing

  const statusText = () => {
    if (result === 'win') return 'AI found all the words!'
    if (result === 'dead') return 'AI hit an assassin. Game over.'
    if (aiGuessing) return 'AI is guessing...'
    if (error) return error
    if (clue) {
      return (
        <ClueDisplay
          word={clue.word}
          count={clue.count}
          guessesUsed={clue.count - guessesRemaining}
          guessesTotal={clue.count}
        />
      )
    }
    return 'Give a clue'
  }

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        {props.onSwitchRole && (
          <span className={styles.rolePicker}>
            <button type="button" className={styles.roleInactive} aria-label="Become operative" title="Become operative" onClick={props.onSwitchRole}>🙂</button>
            <span className={styles.roleActive} role="img" aria-label="You are the spymaster">🕵️‍♀️</span>
          </span>
        )}
        <span className={styles.count}>{props.game.unrevealedMineCount()}</span>
        {showClueBar ? (
          <ClueBar
            key={clueHistory.length}
            game={props.game}
            selectedCount={selected.size}
            onClue={(word, count) => void handleClue(word, count)}
          />
        ) : (
          <span className={styles.status} role="status">
            {statusText()}
          </span>
        )}
        {result !== 'playing' && (
          <button type="button" className={styles.playAgain} onClick={props.onNewGame}>
            Play again
          </button>
        )}
        {result === 'playing' && error && (
          <button type="button" className={styles.retry} onClick={() => setError(null)}>
            Retry
          </button>
        )}
      </header>

      <div className={styles.boardArea}>
        <Board
          game={props.game}
          loading={false}
          spymasterTeam="blue"
          myTeam="blue"
          selected={selected}
          focus={showClueBar && selected.size > 0}
          feedback={feedback}
          onToggleSelect={showClueBar ? toggleSelected : () => {}}
          onClearSelection={() => animate(() => setSelected(new Set()))}
          onCardClick={() => {}}
          onCardMark={() => {}}
        />
      </div>

      {result === 'win' && <Confetti />}
    </main>
  )
}
