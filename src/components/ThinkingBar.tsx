import { useEffect, useState } from 'react'
import type { Team } from '../classic/Game'
import { playSound } from '../sound'
import styles from './ThinkingBar.module.css'

export function ThinkingBar(props: { team: Team }) {
  const [seconds, setSeconds] = useState(0)
  const capped = seconds >= CAP_MINUTES * 60
  useEffect(() => {
    if (capped) return
    const id = setTimeout(() => setSeconds((s) => s + 1), 1000)
    return () => clearTimeout(id)
  }, [seconds, capped])

  const completed = Math.min(Math.floor(seconds / 60), CAP_MINUTES)
  useEffect(() => {
    if (capped || seconds === 0 || seconds % 30 !== 0) return
    if (seconds % 60 === 0) playSound('tictac')
    else playSound('tictac', 1, { duration: 0.4 })
  }, [seconds, capped])

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
        <span key={`current-${completed}`} className={styles.cell}>
          <span className={styles.fill} />
        </span>
      )}
      {Array.from({ length: capped ? 0 : CAP_MINUTES - completed - 1 }, (_, i) => (
        <span key={`empty-${i}`} className={styles.cell} />
      ))}
    </span>
  )
}

const CAP_MINUTES = 10
