import styles from './StatusBanner.module.css'

export function StatusBanner(props: { text: string }) {
  return (
    <div className={styles.banner} role="status">
      {props.text}
    </div>
  )
}
