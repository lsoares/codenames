import { useEffect, useState } from 'react'
import type { Team } from '../Game'
import { playTick } from '../sound'
import styles from './ThinkingBar.module.css'

const CAP_MINUTES = 10 // stop at ten minutes — by then nobody's still at the board

// A calm, local count-up clock shown to whoever is currently thinking — the
// spymaster planning a clue, or the operatives weighing their guesses. A fixed
// ten-cell bar, one cell per minute; the current minute's cell fills left-to-right
// across its minute (story-bar style), so progress is felt without a ticking number.
// A soft beep marks each whole minute. At ten minutes it stops and greys out. Purely
// client-local: nobody else sees or hears another player's clock.
export default function ThinkingBar(props: { team: Team }) {
  const [seconds, setSeconds] = useState(0)
  const capped = seconds >= CAP_MINUTES * 60
  useEffect(() => {
    if (capped) return
    const id = setTimeout(() => setSeconds((s) => s + 1), 1000)
    return () => clearTimeout(id)
  }, [seconds, capped])

  const completed = Math.min(Math.floor(seconds / 60), CAP_MINUTES)
  // Not every second — that's maddening. A single soft tic at each half-minute, and a
  // clear two-click tic-tac at each whole minute, so time is marked without a constant
  // ticking clock. Both clicks of the minute are scheduled on the audio clock so the
  // tic is never dropped or masked.
  useEffect(() => {
    if (capped || seconds === 0 || seconds % 30 !== 0) return
    if (seconds % 60 === 0) {
      playTick(0, 0.6) // tic
      playTick(1, 0.6, 0.22) // …tac
    } else {
      playTick(0, 0.5) // a lone tic at the half-minute
    }
  }, [seconds, capped])

  const fraction = (seconds % 60) / 60
  const total = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

  return (
    <span
      className={styles.bar}
      data-team={props.team}
      data-capped={capped || undefined}
      title={`Thinking for ${total}`}
    >
      {Array.from({ length: completed }, (_, i) => (
        <span key={`filled-${i}`} className={styles.cell} data-filled="" />
      ))}
      {!capped && (
        // Keyed on the minute so each new minute mounts a fresh cell whose fill starts
        // at zero and grows, rather than the previous fill sliding back to zero.
        <span key={`current-${completed}`} className={styles.cell}>
          <span className={styles.fill} style={{ width: `${fraction * 100}%` }} />
        </span>
      )}
      {Array.from({ length: capped ? 0 : CAP_MINUTES - completed - 1 }, (_, i) => (
        <span key={`empty-${i}`} className={styles.cell} />
      ))}
    </span>
  )
}
