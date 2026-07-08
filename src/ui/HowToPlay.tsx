import { useRef } from 'react'
import styles from './HowToPlay.module.css'

// A quiet ⓘ button in the top corner that opens the rules in a modal dialog.
// Shared by the homepage and the game screen.
export default function HowToPlay() {
  const dialog = useRef<HTMLDialogElement>(null)
  return (
    <>
      <button
        type="button"
        className={styles.info}
        aria-label="How to play"
        title="How to play"
        onClick={() => dialog.current?.showModal()}
      >
        i
      </button>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-label="How to play"
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current.close()
        }}
      >
        <button type="button" className={styles.close} aria-label="Close" onClick={() => dialog.current?.close()}>
          ✕
        </button>
        <h2 className={styles.heading}>How to play</h2>
        <ul className={styles.list}>
          <li>
            Two teams — <span className={styles.red}>red</span> and <span className={styles.blue}>blue</span>. Each has
            a <strong>spymaster</strong>; the rest are operatives.
          </li>
          <li>
            The board is <strong>20 cards</strong>, and only the spymasters see who owns which:
            <ul>
              <li>
                <span className={styles.red}>8</span> / <span className={styles.blue}>7</span> belong to the teams
                (the team that goes first gets the extra one)
              </li>
              <li>4 are neutral bystanders</li>
              <li>1 is the assassin</li>
            </ul>
          </li>
          <li>
            The spymasters take turns giving a <strong>one-word clue</strong> plus a number.
            <ul>
              <li>the number is how many cards the clue points to</li>
              <li>operatives may guess that many, plus one</li>
            </ul>
          </li>
          <li>That team's operatives discuss and guess cards based on the clue.</li>
          <li>
            Avoid touching:
            <ul>
              <li>the other team's cards</li>
              <li>the neutral bystanders</li>
              <li>
                the <strong>assassin</strong> — touching it loses the game instantly
              </li>
            </ul>
          </li>
          <li>
            The first team to find <strong>all of its own agents</strong> wins.
          </li>
        </ul>
        <a
          className={styles.more}
          href="https://filemanager.czechgames.com/storage/files/codenames-pictures-2016/rules/codenames-pictures-rules-en.pdf"
          target="_blank"
          rel="noreferrer"
        >
          Full rules ↗
        </a>
      </dialog>
    </>
  )
}
