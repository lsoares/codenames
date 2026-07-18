import { useRef, useState } from 'react'
import styles from './RoomInvite.module.css'

export function RoomInvite() {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number>()
  const url = `https://codenamesany.pages.dev${window.location.pathname}`
  const roomName = decodeURIComponent(window.location.pathname).replace(/^\/+|\/+$/g, '')
  return (
    <div className={styles.invite}>
      <span className={styles.prompt}>Invite</span>
      <div className={styles.roomLine}>
        <span className={styles.copied} data-show={copied || undefined} aria-live="polite">
          {copied ? 'Invite link copied!' : ''}
        </span>
        <button
          type="button"
          className={styles.roomName}
          aria-label="Copy join link"
          title="Copy link"
          onClick={() => {
            void navigator.clipboard?.writeText(url)
            setCopied(true)
            window.clearTimeout(timer.current)
            timer.current = window.setTimeout(() => setCopied(false), 1400)
          }}
        >
          {roomName}
        </button>
      </div>
    </div>
  )
}
