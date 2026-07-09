import { useEffect } from 'react'
import styles from './ImageLightbox.module.css'

export default function ImageLightbox(props: { url: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') props.onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [props.onClose])

  // The backdrop closes on click; the image stops the click so only the surround
  // dismisses. The whole photo shows uncropped, unlike the board's zoomed-in face.
  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" onClick={props.onClose}>
      <button type="button" className={styles.close} aria-label="Close" onClick={props.onClose}>
        ✕
      </button>
      <img
        className={styles.image}
        src={props.url}
        alt=""
        draggable={false}
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  )
}
