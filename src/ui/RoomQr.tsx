import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import styles from './RoomQr.module.css'

export default function RoomQr(props: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}${window.location.pathname}`
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
  )
}
