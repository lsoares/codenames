import type { ArenaScoreEntry } from './messages'
import styles from './Scoreboard.module.css'

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
            title={`${entry.found}/${entry.total}`}
          >
            <span className={styles.emoji}>{entry.emoji}</span>
            <span className={styles.count}>{remaining}</span>
          </span>
        )
      })}
    </span>
  )
}
