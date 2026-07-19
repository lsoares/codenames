import type { ArenaScoreEntry } from './messages'
import styles from './Scoreboard.module.css'

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function Scoreboard(props: {
  entries: ArenaScoreEntry[]
  selfId: string
  winner: string | null
  onSwitchRole?: () => void
}) {
  return (
    <span className={styles.scoreboard}>
      {props.onSwitchRole && (
        <button
          type="button"
          className={styles.switchRole}
          aria-label="Switch role"
          title="Switch role"
          onClick={props.onSwitchRole}
        >
          🔄
        </button>
      )}
      {props.entries.map((entry) => {
        const isSelf = entry.id === props.selfId
        const remaining = entry.total - entry.found
        return (
          <span
            key={entry.id}
            className={styles.player}
            data-self={isSelf || undefined}
            data-dead={entry.dead || undefined}
            data-winner={entry.id === props.winner || undefined}
            title={formatTime(entry.timeMs)}
          >
            <span className={styles.emoji}>{entry.emoji}</span>
            <span className={styles.count}>{remaining}</span>
            <span className={styles.time}>{formatTime(entry.timeMs)}</span>
          </span>
        )
      })}
    </span>
  )
}
