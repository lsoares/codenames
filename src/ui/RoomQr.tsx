import { useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import styles from './RoomQr.module.css'

export default function RoomQr() {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number>()
  // Always the public domain, not the current origin, so the link/QR stays
  // scannable when hosting from localhost or a preview build.
  const url = `https://codenamesany.pages.dev${window.location.pathname}`
  const roomName = decodeURIComponent(window.location.pathname).replace(/^\/+|\/+$/g, '')
  return (
    <div className={styles.invite}>
      {/* The room name copies the link; "Copied!" floats above it, then fades. */}
      <div className={styles.roomLine}>
        <span className={styles.copied} data-show={copied || undefined} role="status" aria-live="polite">
          {copied ? 'Copied!' : ''}
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
      <div className={styles.qr}>
        <QRCodeSVG value={url} size={180} />
      </div>
    </div>
  )
}
