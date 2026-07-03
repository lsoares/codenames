import styles from './Toaster.module.css'

export default function Toaster(props: { toasts: Array<{ id: number; text: string }> }) {
  return (
    <div className={styles.toaster} aria-live="polite">
      {props.toasts.map((toast) => (
        <div key={toast.id} className={styles.toast}>
          {toast.text}
        </div>
      ))}
    </div>
  )
}
