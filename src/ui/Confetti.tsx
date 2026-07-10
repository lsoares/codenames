import styles from './Confetti.module.css'

export default function Confetti() {
  return (
    <div className={styles.confetti} aria-hidden="true">
      {Array.from({ length: 80 }, (_, i) => (
        <span
          key={i}
          style={{
            left: `${Math.random() * 100}%`,
            background: ['#e63946', '#f4a261', '#2a9d8f', '#457b9d', '#ffd166', '#b56576'][i % 6],
            animationDuration: `${2 + Math.random() * 1.6}s`,
            animationDelay: `${Math.random() * 1}s`,
          }}
        />
      ))}
    </div>
  )
}
