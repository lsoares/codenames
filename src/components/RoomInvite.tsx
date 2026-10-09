import { useRef, useState } from 'react'
import { track } from '../analytics'
import styles from './RoomInvite.module.css'

export function RoomInvite() {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number>()
  const url = `https://codenamesany.pages.dev${window.location.pathname}`
  return (
    <button
      type="button"
      className={styles.invite}
      aria-label="Copy invite link"
      title="Copy invite link"
      onClick={() => {
        void navigator.clipboard?.writeText(url)
        track('invite copied')
        setCopied(true)
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => setCopied(false), 1400)
      }}
    >
      {copied ? 'Copied!' : 'Invite'}
    </button>
  )
}
