import { useEffect, useState, type CSSProperties } from 'react'
import type { Face } from '../Face'
import { Game, type Card, type GuessOutcome, type Team } from '../Game'
import ImageLightbox from './ImageLightbox'
import styles from './Board.module.css'

const feedbackBadge: Record<GuessOutcome, { emoji: string; label: string }> = {
  correct: { emoji: '🎯', label: 'correct guess' },
  wrong: { emoji: '❌', label: 'wrong guess' },
  neutral: { emoji: '🤷', label: 'neutral card' },
  assassin: { emoji: '💀', label: 'assassin' },
}

// Each face kind renders its own way: a glyph big, a word sized to read, a photo
// full-bleed (per its own fit), a pictogram as a recolorable mask. The switch is
// exhaustive over Face — a new kind won't compile until it's handled here.
function renderFace(face: Face) {
  switch (face.kind) {
    case 'glyph':
      return <span className={`${styles.face} ${styles.word} ${styles.big}`}>{face.text}</span>
    case 'text':
      return <span className={`${styles.face} ${styles.word}`}>{face.text}</span>
    case 'image':
      return (
        <span className={`${styles.face} ${styles.imageWrap}`}>
          <img
            className={`${styles.image} ${
              face.fit === 'framed' ? styles.framed : face.fit === 'contain' ? styles.contain : ''
            }`}
            src={face.url}
            alt=""
            draggable={false}
          />
        </span>
      )
    case 'icon':
      return (
        <span
          className={`${styles.face} ${styles.svgIcon}`}
          style={{ ['--mask']: `url("${face.url}")` } as CSSProperties}
        />
      )
  }
}

export default function Board(props: {
  game: Game
  loading: boolean
  spymasterTeam: Team | null
  myTeam: Team
  selected: Set<number>
  focus: boolean
  feedback: Record<number, GuessOutcome>
  onToggleSelect: (index: number) => void
  onClearSelection: () => void
  onCardClick: (index: number) => void
  onCardMark: (index: number) => void
}) {
  const isSpymaster = props.spymasterTeam !== null
  const cards = props.game.state.cards
  const gameOver = props.game.state.winner !== null
  const [zoomed, setZoomed] = useState<string | null>(null)

  // Esc drops the spymaster's picks — but not while a zoomed photo is open, which
  // owns Esc to close itself first (one press dismisses one layer at a time).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || zoomed) return
      if (isSpymaster && props.selected.size > 0) props.onClearSelection()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomed, isSpymaster, props.selected.size, props.onClearSelection])

  // Both roles single out cards the same way — the picked card stays lit while the
  // rest of the board dims. A spymaster's picks are private (the selected set, owned
  // by GameScreen so the clue's proposed number can follow it); an operative sees
  // their own team's shared marks (`card.markedBy`, toggled by right-click).
  const highlighted = (card: Card, index: number): boolean =>
    !card.revealed &&
    !gameOver &&
    (isSpymaster ? props.selected.has(index) : card.markedBy.includes(props.myTeam))
  const spotlight = isSpymaster && cards.some((card, index) => highlighted(card, index))

  // Focus mode: a private, temporary spymaster view for planning a clue. It drops
  // the revealed cards and clusters the rest so the cards you can clue sit together
  // — the ones you've already picked first, then the rest of yours, then the
  // assassin, enemy and neutral cards you must steer around. The real card order
  // (GameState.cards) never changes; this only reorders what this client renders.
  const focusRank = (card: Card, index: number): number =>
    props.selected.has(index)
      ? 0
      : card.color === props.spymasterTeam
        ? 1
        : card.color === 'assassin'
          ? 2
          : card.color === 'neutral'
            ? 4
            : 3
  const order =
    props.focus && isSpymaster
      ? cards
          .map((_, index) => index)
          .filter((index) => !cards[index].revealed)
          .sort((a, b) => focusRank(cards[a], a) - focusRank(cards[b], b))
      : cards.map((_, index) => index)

  return (
    <>
    <div
      className={styles.board}
      data-focus={props.focus || undefined}
      data-spotlight={spotlight || undefined}
      data-over={gameOver || undefined}
    >
      {order.map((index) => {
        const card = cards[index]
        const showColor = props.game.showsColor(index, isSpymaster)
        // Once the game is won every card reads as revealed — laid face-up, out of
        // play — even the ones nobody guessed.
        const revealed = card.revealed || gameOver
        // Word/glyph cards are named by their text; picture cards by position.
        const name =
          card.face.kind === 'text' || card.face.kind === 'glyph' ? card.face.text : `Card ${index + 1}`
        // Announce an operative's own-team mark so it's perceivable without sight.
        const marked = !isSpymaster && highlighted(card, index)
        const label = showColor ? `${name}, ${card.color}` : marked ? `${name}, marked` : name
        const actionable = props.game.canAct(index, { team: props.myTeam, isSpymaster })
        const badge = gameOver && card.revealed ? card.outcome : props.feedback[index]
        const canMark = props.game.canMark(index, isSpymaster)
        // A photo with no reference link offers a zoom instead of the ↗ link.
        const zoomUrl = card.face.kind === 'image' && !card.face.link ? card.face.url : null
        return (
          // A per-card view-transition name lets the browser glide each card from
          // its old spot to its new one when Focus mode reorders the board.
          <div
            key={index}
            className={styles.cell}
            style={{ viewTransitionName: `card-${index}` } as CSSProperties}
          >
            <button
              className={styles.card}
              aria-label={label}
              title={card.face.tooltip}
              data-color={showColor ? card.color : undefined}
              data-mine={
                (isSpymaster && !card.revealed && card.color === props.spymasterTeam) ||
                undefined
              }
              data-revealed={revealed || undefined}
              data-feedback={props.feedback[index] || undefined}
              data-selected={(isSpymaster && highlighted(card, index)) || undefined}
              data-inert={!actionable || undefined}
              disabled={revealed}
              onClick={() => {
                if (!actionable) return
                if (isSpymaster) props.onToggleSelect(index)
                else props.onCardClick(index)
              }}
            >
              {props.loading ? (
                <span className={`${styles.face} ${styles.loading}`} />
              ) : (
                renderFace(card.face)
              )}
              {badge && (
                <span className={styles.feedback} role="img" aria-label={feedbackBadge[badge].label}>
                  {feedbackBadge[badge].emoji}
                </span>
              )}
            </button>
            {canMark && (
              <button
                type="button"
                className={styles.overlayIcon}
                data-on={marked || undefined}
                aria-label={`${marked ? 'Unmark' : 'Mark'} ${name}`}
                title={`${marked ? 'Unmark' : 'Mark'} ${name}`}
                onClick={() => props.onCardMark(index)}
              >
                📌
              </button>
            )}
            {card.face.link && !props.loading && (
              // A subtle reference link (dictionary, TMDB, …). Its own <a>, a sibling
              // of the card button — never nested — so opening it can't trigger a guess.
              <a
                className={styles.linkIcon}
                href={card.face.link}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Look up ${name}`}
                title={`Look up ${name}`}
                onClick={(event) => event.stopPropagation()}
              >
                ↗
              </a>
            )}
            {zoomUrl && !props.loading && (
              // Enlarge the whole, uncropped photo in a lightbox. Its own button, a
              // sibling of the card — never nested — so it can't trigger a guess.
              <button
                type="button"
                className={styles.zoomIcon}
                aria-label={`Enlarge ${name}`}
                title={`Enlarge ${name}`}
                onClick={(event) => {
                  event.stopPropagation()
                  setZoomed(zoomUrl)
                }}
              >
                🔍
              </button>
            )}
          </div>
        )
      })}
    </div>
    {zoomed && <ImageLightbox url={zoomed} onClose={() => setZoomed(null)} />}
    </>
  )
}
