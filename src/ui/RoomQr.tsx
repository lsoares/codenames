import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import styles from './RoomQr.module.css'

export default function RoomQr(props: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [copied, setCopied] = useState(false)
  // Always the public domain, not the current origin, so the link/QR stays
  // scannable when hosting from localhost or a preview build.
  const url = `https://codenamesany.pages.dev${window.location.pathname}`
  const roomName = decodeURIComponent(window.location.pathname).replace(/^\/+|\/+$/g, '')
  useEffect(() => {
    if (props.open) {
      setCopied(false)
      dialog.current?.showModal()
    }
  }, [props.open])
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-label="Room QR code"
      onClose={props.onClose}
      onClick={(event) => {
        if (event.target === dialog.current) dialog.current.close()
      }}
    >
      <div className={styles.qr}>
        <QRCodeSVG value={url} size={260} />
      </div>
      {/* The QR just shows the link; the actions below own sharing and copying. */}
      <div className={styles.share}>
        <div className={styles.roomLine}>
          <button
            type="button"
            className={styles.roomName}
            aria-label={copied ? 'Link copied' : 'Copy join link'}
            title="Copy link"
            onClick={() => {
              void navigator.clipboard?.writeText(url)
              setCopied(true)
            }}
          >
            {roomName}
          </button>
          {typeof navigator.share === 'function' && (
            <button
              type="button"
              className={styles.iconBtn}
              aria-label="Share"
              title="Share"
              onClick={() => {
                void navigator.share({ title: 'Codenames', text: `Join my room: ${roomName}`, url }).catch(() => {})
              }}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" />
              </svg>
            </button>
          )}
        </div>
        <span className={styles.copied} role="status" aria-live="polite">
          {copied ? 'Copied!' : ''}
        </span>
      </div>
    </dialog>
  )
}
