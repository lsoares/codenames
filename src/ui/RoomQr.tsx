import { useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import styles from './RoomQr.module.css'

export default function RoomQr() {
  const dialog = useRef<HTMLDialogElement>(null)
  const [copied, setCopied] = useState(false)
  const url = `https://lsoares.github.io/codenames/${window.location.hash}`
  return (
    <>
      <button
        type="button"
        className={styles.badge}
        aria-label="Invite players"
        title="Invite players"
        onClick={() => {
          setCopied(false)
          dialog.current?.showModal()
        }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.6" y1="10.5" x2="15.4" y2="6.5" />
          <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
        </svg>
      </button>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-label="Room QR code"
        onClose={() => setCopied(false)}
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current.close()
        }}
      >
        <button
          type="button"
          className={styles.qr}
          aria-label="Copy join link"
          title="Copy join link"
          onClick={() => {
            void navigator.clipboard?.writeText(url)
            setCopied(true)
          }}
        >
          <QRCodeSVG value={url} size={260} />
        </button>
        <span className={styles.copied} role="status" aria-live="polite">
          {copied ? 'Copied!' : ''}
        </span>
      </dialog>
    </>
  )
}
