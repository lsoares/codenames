import { useState } from 'react'
import styles from './Lobby.module.css'

export default function Lobby(props: {
  status: string
  onCreate: () => void
  onJoin: (code: string) => void
}) {
  const [code, setCode] = useState('')
  return (
    <main className={`card ${styles.lobby}`}>
      <h1>Codenames Pictures</h1>
      <p className={styles.tagline}>Guess your team's pictures from one-word clues.</p>

      <button onClick={props.onCreate}>Create room</button>

      <div className={styles.divider}>or</div>

      <form
        className={styles.join}
        onSubmit={(event) => {
          event.preventDefault()
          props.onJoin(code)
        }}
      >
        <label htmlFor="room-code">Room code</label>
        <input
          id="room-code"
          value={code}
          placeholder="paste a room code"
          onChange={(event) => setCode(event.target.value)}
        />
        <button type="submit" className="secondary">
          Join
        </button>
      </form>

      {props.status && <p className={styles.status}>{props.status}</p>}
    </main>
  )
}
