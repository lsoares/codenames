import { useEffect, useState } from 'react'
import type { Team } from '../Game'
import { playSound } from '../sound'
import styles from './ThinkingBeads.module.css'

const CAP_SECONDS = 600 // stop at ten minutes — by then nobody's still at the board

// A calm, local count-up clock shown to whoever is currently thinking — the
// spymaster planning a clue, or the operatives weighing their guesses. One dot per
// minute; the current minute fades in from faint to full, so progress is felt
// without a ticking number. A soft beep marks each whole minute. At ten minutes it
// stops and greys out. Purely client-local: nobody else sees or hears another
// player's clock.
export default function ThinkingBeads(props: { team: Team }) {
  const [seconds, setSeconds] = useState(0)
  const capped = seconds >= CAP_SECONDS
  useEffect(() => {
    if (capped) return
    const id = setTimeout(() => setSeconds((s) => s + 1), 1000)
    return () => clearTimeout(id)
  }, [seconds, capped])

  const completed = Math.min(Math.floor(seconds / 60), 10)
  // A soft cue each time a whole minute lands, so a long think is felt, not watched.
  useEffect(() => {
    if (completed > 0) playSound('minute', 0.5) // quieter than the game's other cues
  }, [completed])

  const fraction = (seconds % 60) / 60
  const total = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

  return (
    <span
      className={styles.beads}
      data-team={props.team}
      data-capped={capped || undefined}
      title={`Thinking for ${total}`}
    >
      {Array.from({ length: completed }, (_, i) => (
        <span key={i} className={styles.dot} />
      ))}
      {!capped && (
        // Keyed on the minute so each new minute mounts a fresh faint dot that fades
        // in, rather than the previous one fading back out.
        <span
          key={completed}
          className={`${styles.dot} ${styles.fading}`}
          style={{ opacity: 0.35 + 0.65 * fraction }}
        />
      )}
    </span>
  )
}
