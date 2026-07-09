import { useRef } from 'react'
import styles from './HowToPlay.module.css'

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
          <div className={`${styles.strip} ${styles.phase}`}>
            <span className={styles.phaseTag}>Setup</span>
            <div className={styles.scene}>
              <div className={styles.team} data-team="red" aria-hidden="true">
                <div className={styles.roleCol}>
                  <span className={`${styles.person} ${styles.spy}`}>🕵️</span>
                  <span className={styles.roleLabel}>Spymaster</span>
                </div>
                <div className={styles.roleCol}>
                  <div className={styles.opsRow}>
                    <span className={styles.person}>👤</span>
                    <span className={styles.person}>👤</span>
                  </div>
                  <span className={styles.roleLabel}>Operatives</span>
                </div>
              </div>
              <div className={styles.boardGroup} aria-hidden="true">
                <div className={styles.board}>
                  {BOARD.map((color, i) => (
                    <span key={i} className={styles.chip} data-color={color} />
                  ))}
                </div>
                <span className={styles.compo}>
                  20 agent cards (<span className={styles.blue}>7 blue</span>, <span className={styles.red}>8 red</span>,
                  4 neutral, 1 assassin)
                </span>
              </div>
              <div className={styles.team} data-team="blue" aria-hidden="true">
                <div className={styles.roleCol}>
                  <span className={`${styles.person} ${styles.spy}`}>🕵️</span>
                  <span className={styles.roleLabel}>Spymaster</span>
                </div>
                <div className={styles.roleCol}>
                  <div className={styles.opsRow}>
                    <span className={styles.person}>👤</span>
                    <span className={styles.person}>👤</span>
                  </div>
                  <span className={styles.roleLabel}>Operatives</span>
                </div>
              </div>
            </div>
            <p className={styles.caption}>
Players join <strong>two teams</strong> — <span className={styles.red}>red</span> and{' '}
              <span className={styles.blue}>blue</span> (<strong>4+ players</strong>). Only the{' '}
              <strong>spymasters see the colors</strong>.
            </p>
          </div>

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
                  <span className={styles.thinker}>
                    <span className={`${styles.person} ${styles.spy} ${styles.clueSpy}`}>🕵️</span>
                    <span className={styles.think}>💭</span>
                  </span>
                  <span className={styles.cluePill}>
                    OCEAN <b>2</b>
                  </span>
                </div>
              </div>
              <p className={styles.caption}>
                <span className={styles.title}>Phase 1: Spymaster's clue</span>Gives{' '}
                <strong>one word + a number</strong>, pointing at that many of their cards.
                <span className={styles.aside}>The word links the cards.</span>
              </p>
            </div>

            <div className={`${styles.strip} ${styles.intro}`}>
              <div className={`${styles.panel} ${styles.wide}`}>
                <div className={styles.team} data-team="blue" aria-hidden="true">
                  <span className={styles.person}>👤</span>
                  <span className={styles.emoji}>💬</span>
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
                <span className={styles.title}>Phase 2: Operatives' guesses</span>They discuss, then{' '}
                <strong>pick cards</strong>, which reveals them.
                <span className={styles.aside}>A right card keeps the turn going; a wrong one ends it.</span>
              </p>
            </div>
            </div>
          </div>

          <div className={`${styles.strip} ${styles.phase}`}>
            <span className={styles.phaseTag}>End</span>
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
The first team to find <strong>all its agents wins</strong>.
              <span className={styles.aside}>Touch the assassin (the black card) and you lose instantly.</span>
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

const BOARD = [
  'red', 'blue', 'neutral', 'red', 'blue',
  'blue', 'red', 'blue', 'neutral', 'red',
  'neutral', 'blue', 'red', 'blue', 'assassin',
  'red', 'blue', 'neutral', 'red', 'red',
]

const CLUED = new Set([5, 13])

const FACES = ['●', '■', '▲', '◆', '★', '✚', '◇', '△', '☆', '✦', '❖', '◈', '✜', '⬟', '✱', '◔', '▰', '⬢', '✧', '◑']

const REVEALED: Record<number, string> = { 7: '✓', 10: '✕', 12: '✕' }
