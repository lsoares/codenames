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

// Two of the blue team's cards (indices in BOARD), ringed on the Clue strip as the
// ones the sample clue "OCEAN, 2" points at.
const CLUED = new Set([5, 13])

// The operatives' view: the same board but colourless — just the card faces (stand-in
// shapes), because they can't see who owns what.
const FACES = ['●', '■', '▲', '◆', '★', '✚', '◇', '△', '☆', '✦', '❖', '◈', '✜', '⬟', '✱', '◔', '▰', '⬢', '✧', '◑']

// A few cards already picked on the operatives' board (index → outcome), flipped to
// show their real colour: a right one keeps the turn going, a wrong one ends it.
const REVEALED: Record<number, string> = { 7: '✓', 10: '✕', 12: '✕' }

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
            <div className={styles.scene}>
              <div className={styles.teamGroup} data-team="red" aria-hidden="true">
                <div className={styles.team} data-team="red">
                  <span className={`${styles.person} ${styles.spy}`}>🕵️</span>
                  <span className={styles.person}>👤</span>
                  <span className={styles.person}>👤</span>
                </div>
                <span className={styles.teamLabel}>Team Red</span>
              </div>
              <div className={styles.boardGroup} aria-hidden="true">
                <div className={styles.board}>
                  {BOARD.map((color, i) => (
                    <span key={i} className={styles.chip} data-color={color} />
                  ))}
                </div>
                <span className={styles.compo}>
                  20 cards (<span className={styles.blue}>7 blue</span>, <span className={styles.red}>8 red</span>, 4
                  neutral, 1 assassin)
                </span>
              </div>
              <div className={styles.teamGroup} data-team="blue" aria-hidden="true">
                <div className={styles.team} data-team="blue">
                  <span className={`${styles.person} ${styles.spy}`}>🕵️</span>
                  <span className={styles.person}>👤</span>
                  <span className={styles.person}>👤</span>
                </div>
                <span className={styles.teamLabel}>Team Blue</span>
              </div>
            </div>
            <p className={styles.caption}>
              <span className={styles.label}>Setup</span>Only the <strong>spymasters see the colors</strong> — their
              operatives don't.
            </p>
          </div>

          {/* The two beats that loop, turn after turn, until someone wins. */}
          <div className={styles.cycle}>
            <span className={styles.cycleTag}>↻ One team at a time</span>
            <div className={styles.beats}>
              <div className={`${styles.strip} ${styles.intro}`}>
              <div className={`${styles.panel} ${styles.wide}`}>
                <div className={styles.board} aria-hidden="true">
                  {BOARD.map((color, i) => (
                    <span key={i} className={styles.chip} data-color={color} data-clued={CLUED.has(i) || undefined} />
                  ))}
                </div>
                <div className={styles.clueSource} aria-hidden="true">
                  <span className={`${styles.person} ${styles.spy} ${styles.clueSpy}`}>🕵️</span>
                  <span className={styles.cluePill}>
                    OCEAN <b>2</b>
                  </span>
                </div>
              </div>
              <p className={styles.caption}>
                <span className={styles.label}>1 · Spymaster</span>Gives <strong>one word + a number</strong>,
                pointing at that many of their cards. The word is the <strong>clue</strong> that links them (never one
                printed on a card).
              </p>
            </div>

            <div className={`${styles.strip} ${styles.intro}`}>
              <div className={`${styles.panel} ${styles.wide}`}>
                <div className={styles.team} data-team="blue" aria-hidden="true">
                  <span className={styles.person}>👤</span>
                  <span className={styles.person}>👤</span>
                </div>
                <div className={styles.board} aria-hidden="true">
                  {FACES.map((shape, i) =>
                    REVEALED[i] ? (
                      <span key={i} className={`${styles.chip} ${styles.revealed}`} data-color={BOARD[i]}>
                        {REVEALED[i]}
                      </span>
                    ) : (
                      <span key={i} className={styles.faceChip}>
                        {shape}
                      </span>
                    ),
                  )}
                </div>
              </div>
              <p className={styles.caption}>
                <span className={styles.label}>2 · Operatives</span>Discuss and <strong>pick cards</strong> (that many,
                plus one). A <strong>right</strong> card <strong>keeps the turn going</strong>; a{' '}
                <strong>wrong</strong> one <strong>ends it</strong>.
              </p>
            </div>
            </div>
          </div>

          <div className={styles.strip}>
            <div className={styles.scene}>
              <div className={styles.board} aria-hidden="true">
                {BOARD.map((color, i) =>
                  color === 'blue' ? (
                    <span key={i} className={`${styles.chip} ${styles.revealed}`} data-color={color}>
                      ✓
                    </span>
                  ) : (
                    <span key={i} className={styles.chip} data-color={color} />
                  ),
                )}
              </div>
              <div className={styles.team} data-team="blue" aria-hidden="true">
                <span className={`${styles.person} ${styles.spy}`}>🕵️</span>
                <span className={styles.person}>👤</span>
                <span className={styles.person}>👤</span>
              </div>
              <span className={styles.trophy} aria-hidden="true">
                🏆
              </span>
            </div>
            <p className={styles.caption}>
              <span className={styles.label}>End</span>The first team to find <strong>all its agents wins</strong>.
              Touch the <strong>assassin</strong> (the black card) and you <strong>lose instantly</strong>.
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
