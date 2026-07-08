import { useRef } from 'react'
import styles from './HowToPlay.module.css'

// The 20-card board, colored 8 / 7 / 4 / 1 like a real deal (see Game.ts), in a
// fixed representative layout for the Setup strip.
const BOARD = [
  'red', 'blue', 'neutral', 'red', 'blue',
  'blue', 'red', 'blue', 'neutral', 'red',
  'neutral', 'blue', 'red', 'blue', 'assassin',
  'red', 'blue', 'neutral', 'red', 'red',
]

// A quiet ⓘ button in the top corner that opens the rules — a four-strip comic —
// in a modal dialog. Shared by the homepage and the game screen.
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

        <div className={styles.strips}>
          <div className={styles.strip}>
            <div className={styles.panel}>
              <div className={styles.board} aria-hidden="true">
                {BOARD.map((color, i) => (
                  <span key={i} className={styles.chip} data-color={color} />
                ))}
              </div>
            </div>
            <p className={styles.caption}>
              <span className={styles.label}>Setup</span>20 cards (<span className={styles.red}>8</span> /{' '}
              <span className={styles.blue}>7</span> to the teams, 4 neutral, 1 assassin). Only the two{' '}
              <strong>spymasters</strong> see the colors.
            </p>
          </div>

          {/* The two beats that loop, turn after turn, until someone wins. */}
          <div className={styles.cycle}>
            <span className={styles.cycleTag}>↻ Teams alternate each turn</span>
            <div className={styles.strip}>
              <div className={styles.panel}>
                <span className={styles.spy} aria-hidden="true">
                  🕵️
                </span>
                <span className={styles.arrow} aria-hidden="true">
                  →
                </span>
                <span className={styles.cluePill} aria-hidden="true">
                  OCEAN <b>2</b>
                </span>
              </div>
              <p className={styles.caption}>
                <span className={styles.label}>Clue</span>The spymaster gives one <strong>word</strong> + a{' '}
                <strong>number</strong> — how many cards it points to.
              </p>
            </div>

            <div className={styles.strip}>
              <div className={styles.panel}>
                <span className={styles.guess} aria-hidden="true">
                  <span className={styles.chip} data-color="blue" data-tap="" />✓
                </span>
                <span className={styles.guess} aria-hidden="true">
                  <span className={styles.chip} data-color="neutral" data-tap="" />✕
                </span>
              </div>
              <p className={styles.caption}>
                <span className={styles.label}>Guess</span>Operatives discuss and pick cards (that many, plus one).
                A right card lets them <strong>keep going</strong>; a wrong one <strong>ends the turn</strong>.
              </p>
            </div>
          </div>

          <div className={styles.strip}>
            <div className={styles.panel}>
              <span className={styles.outcome} aria-hidden="true">
                🏆
              </span>
              <span className={styles.outcome} data-bad="" aria-hidden="true">
                💀
              </span>
            </div>
            <p className={styles.caption}>
              <span className={styles.label}>End</span>Find <strong>all your agents</strong> to win — but touch the{' '}
              <strong>assassin</strong> and you lose instantly.
            </p>
          </div>
        </div>

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
