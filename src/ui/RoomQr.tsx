import { useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import styles from './RoomQr.module.css'

// A subtle corner badge that reveals this room's join QR: the badge is itself a
// tiny QR of the room URL, and clicking blows it up in a modal so someone across
// the table can scan straight into the room. A native <dialog> so Esc and the
// backdrop close it for free.
export default function RoomQr() {
  const dialog = useRef<HTMLDialogElement>(null)
  // Always the deployed app's URL, never window.location.href: hosting is P2P
  // through the public broker, so a phone that scans this joins our room even
  // while we host from localhost — where our own href would be unreachable.
  const url = `https://lsoares.github.io/codenames/${window.location.hash}`
  return (
    <>
      <button
        type="button"
        className={styles.badge}
        aria-label="Show room QR code"
        title="Show room QR code"
        onClick={() => dialog.current?.showModal()}
      >
        <QRCodeSVG value={url} size={26} />
      </button>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-label="Room QR code"
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current.close()
        }}
      >
        <QRCodeSVG value={url} size={260} />
      </dialog>
    </>
  )
}
