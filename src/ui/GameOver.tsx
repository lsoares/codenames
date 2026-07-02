import type { Team } from '../game/createGame'
import styles from './GameOver.module.css'

export default function GameOver(props: { winner: Team; byAssassin: boolean; onNewGame: () => void }) {
  return (
    <div className={styles.banner} role="status" data-team={props.winner}>
      <span>
        {props.byAssassin && '☠️ '}
        {props.winner === 'red' ? 'Red' : 'Blue'} team wins!
        {props.byAssassin ? ' (assassin revealed)' : ' 🎉'}
      </span>
      <button className="secondary" onClick={props.onNewGame}>
        New game
      </button>
    </div>
  )
}
