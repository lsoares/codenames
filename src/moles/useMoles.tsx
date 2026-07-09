import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { MolesView, Player } from '../multiplayer/Session'
import type { MoleKind, MoleSighting } from './MoleGame'
import { playSound } from '../sound'
import styles from './Moles.module.css'

export function useMoles(
  view: MolesView | null,
  hidden: boolean,
  players: readonly Player[],
  selfId: string,
  onWhack: (moleId: number, reactionMs: number) => void,
): { overlayFor: (cardIndex: number) => ReactNode; hud: ReactNode; cursorClass: string } {
  const moles = view?.moles ?? []
  const shownAt = useRef(new Map<number, number>())
  const [whackedIds, setWhackedIds] = useState<ReadonlySet<number>>(new Set())
  useEffect(() => {
    const seen = shownAt.current
    moles.forEach((mole) => {
      if (!seen.has(mole.id)) seen.set(mole.id, performance.now())
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  // Moles that vanished without anyone getting hit retreat the way they came.
  const [leaving, setLeaving] = useState<readonly MoleSighting[]>([])
  const lastMoles = useRef<readonly MoleSighting[]>([])
  const lastScoreOf = useRef<Readonly<Record<string, number>>>({})
  useEffect(() => {
    const scores = view?.scores ?? {}
    const before = lastScoreOf.current
    const whacked = Object.keys({ ...before, ...scores }).some(
      (id) => (before[id] ?? 0) !== (scores[id] ?? 0),
    )
    const gone = lastMoles.current.filter((mole) => !moles.some((m) => m.id === mole.id))
    lastScoreOf.current = scores
    lastMoles.current = moles
    if (gone.length === 0 || whacked) return
    setLeaving((prev) => [...prev, ...gone])
    // Not cancelled on re-run: a broadcast mid-retreat must not strand the ghost.
    setTimeout(() => setLeaving((prev) => prev.filter((mole) => !gone.includes(mole))), 300)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  const whack = (mole: MoleSighting) => {
    if (whackedIds.has(mole.id)) return
    setWhackedIds((prev) => new Set(prev).add(mole.id))
    playSound(mole.kind === 'decoy' ? 'guessWrong' : 'guessRight', 0.6, { duration: 0.3 })
    onWhack(mole.id, Math.round(performance.now() - (shownAt.current.get(mole.id) ?? performance.now())))
  }

  const overlayFor = (cardIndex: number): ReactNode => {
    if (hidden) return null
    const live = moles.find((mole) => mole.cardIndex === cardIndex)
    if (live) {
      return (
        <span className={styles.hole}>
          <button
            type="button"
            className={styles.mole}
            data-from={live.from}
            aria-label={label[live.kind]}
            disabled={whackedIds.has(live.id)}
            onClick={(event) => {
              event.stopPropagation()
              whack(live)
            }}
          >
            {whackedIds.has(live.id) ? whackedFace[live.kind] : face[live.kind]}
          </button>
        </span>
      )
    }
    const ghost = leaving.find((mole) => mole.cardIndex === cardIndex)
    if (ghost) {
      return (
        <span className={styles.hole} aria-hidden="true">
          <span className={styles.mole} data-from={ghost.from} data-leaving="">
            {face[ghost.kind]}
          </span>
        </span>
      )
    }
    return null
  }

  // The player always figures in the bar (even on zero), so they know which
  // emoji is theirs from the first mole.
  const scored = view ? Object.entries(view.scores) : []
  const ranking = (
    view && !hidden && view.scores[selfId] === undefined ? [...scored, [selfId, 0] as const] : scored
  ).sort((a, b) => b[1] - a[1])
  const hud = (
    <>
      {ranking.length > 0 && !hidden && (
        <div className={styles.scores} role="status" aria-label="Whack-a-mole scores">
          <span aria-hidden="true">🏓</span>
          {ranking.map(([id, score]) => (
            <span key={id} className={styles.score} data-mine={id === selfId || undefined}>
              {players.find((player) => player.id === id)?.emoji ?? '👤'} {score}
            </span>
          ))}
        </div>
      )}
    </>
  )

  return { overlayFor, hud, cursorClass: view && !hidden ? styles.armed : '' }
}

const face: Record<MoleKind, string> = { mole: '🐹', decoy: '🐭', bonus: '🐰' }
const whackedFace: Record<MoleKind, string> = { mole: '💫', decoy: '💢', bonus: '🌟' }
const label: Record<MoleKind, string> = { mole: 'Whack the mole', decoy: 'Mouse', bonus: 'Rabbit' }
