import type { Team } from '../game/createGame'
import styles from './GameOver.module.css'

export default function GameOver(props: { winner: Team; byAssassin: boolean }) {
  return (
    <div
      className={styles.banner}
      role="status"
      data-team={props.winner}
      data-assassin={props.byAssassin || undefined}
    >
      {props.byAssassin && (
        <span className={styles.skull} aria-hidden="true">
          ☠️
        </span>
      )}
      <span>
        {props.byAssassin ? (
          <>
            <strong className={styles.assassin}>Assassin!</strong>{' '}
            {props.winner === 'red' ? 'Red' : 'Blue'} team wins
          </>
        ) : (
          <>{props.winner === 'red' ? 'Red' : 'Blue'} team wins! 🎉</>
        )}
      </span>
    </div>
  )
}
