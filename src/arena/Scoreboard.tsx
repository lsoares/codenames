import styles from './Scoreboard.module.css'
import type { ArenaScoreEntry } from './messages'

interface Props {
  entries: ArenaScoreEntry[]
  selfId: string
  winner: string | null
}

export function Scoreboard(props: Props) {
  if (props.entries.length <= 1) return null
  return (
    <div className={styles.scoreboard}>
      {props.entries.map((entry) => (
        <span
          key={entry.id}
          className={[
            styles.pill,
            entry.dead ? styles.dead : '',
            entry.id === props.winner ? styles.winner : '',
            entry.id === props.selfId ? styles.self : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {entry.found}/{entry.total}
        </span>
      ))}
    </div>
  )
}
