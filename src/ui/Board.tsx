import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { Face } from '../Face'
import type { Card, Team } from '../Game'
import type { Boardable, GuessOutcome } from '../Boardable'
import styles from './Board.module.css'

export function Board(props: {
  game: Boardable
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
  overlay?: (index: number) => ReactNode
  bare?: boolean
  revealedToEnd?: boolean
  markBeforeGuess?: boolean
}) {
  const isSpymaster = props.spymasterTeam !== null
  const cards = props.game.state.cards
  const gameOver = props.game.state.winner !== null
  const [zoomed, setZoomed] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState<Set<number>>(new Set())
  const cooldownTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  const [smallImages, setSmallImages] = useState<Set<string>>(new Set())
  const measureImage = (img: HTMLImageElement) => {
    if (img.naturalWidth < img.clientWidth * 1.5 && img.naturalHeight < img.clientHeight * 1.5)
      setSmallImages((prev) => new Set(prev).add(img.getAttribute('src') ?? ''))
  }

  useEffect(() => () => cooldownTimers.current.forEach(clearTimeout), [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || zoomed) return
      if (isSpymaster && props.selected.size > 0) props.onClearSelection()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomed, isSpymaster, props.selected.size, props.onClearSelection])

  const highlighted = (card: Card, index: number): boolean =>
    !card.revealed &&
    !gameOver &&
    (isSpymaster ? props.selected.has(index) : card.markedBy.includes(props.myTeam))
  const spotlight = isSpymaster && cards.some((card, index) => highlighted(card, index))

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
  // Set iteration keeps insertion order, so this is the order the cards were picked.
  const pickOrder = [...props.selected]
  const order =
    props.focus && isSpymaster
      ? cards
          .map((_, index) => index)
          .filter((index) => !cards[index].revealed)
          .sort((a, b) => {
            const byRank = focusRank(cards[a], a) - focusRank(cards[b], b)
            if (byRank !== 0) return byRank
            // Within the selected group, follow selection order rather than board order.
            if (props.selected.has(a)) return pickOrder.indexOf(a) - pickOrder.indexOf(b)
            return 0
          })
      : props.revealedToEnd
        ? cards
            .map((_, index) => index)
            .sort((a, b) => {
              const aRevealed = cards[a].revealed ? 1 : 0
              const bRevealed = cards[b].revealed ? 1 : 0
              return aRevealed - bRevealed
            })
        : cards.map((_, index) => index)

  return (
    <>
      <div
        className={styles.board}
        style={{ '--cols': 5, '--rows': Math.ceil(cards.length / 5) } as CSSProperties}
        data-focus={props.focus || undefined}
        data-spotlight={spotlight || undefined}
        data-over={gameOver || undefined}
      >
        {order.map((index) => {
          const card = cards[index]
          const showColor = props.game.showsColor(index, isSpymaster)
          const revealed = card.revealed || gameOver
          const name =
            card.face.kind === 'text' || card.face.kind === 'glyph'
              ? card.face.text
              : `Card ${index + 1}`
          const marked = !isSpymaster && highlighted(card, index)
          const label = showColor
            ? `${name}, ${card.color === 'neutral' ? 'bystander' : card.color}`
            : marked
              ? `${name}, marked`
              : name
          const actionable = props.game.canAct(index, { team: props.myTeam, isSpymaster })
          const forbidden = isSpymaster
            ? !revealed && card.color !== props.spymasterTeam
            : card.revealed
          const badge = gameOver && card.revealed ? card.outcome : props.feedback[index]
          const canMark = props.game.canMark(index, isSpymaster)
          const zoomUrl =
            card.face.kind === 'image' && !card.face.link && !smallImages.has(card.face.url)
              ? card.face.url
              : null
          const showCaption =
            !props.bare && !props.loading && !revealed && !(props.focus && isSpymaster)
          return (
            <div
              key={index}
              className={styles.cell}
              style={{ viewTransitionName: `card-${index}` } as CSSProperties}
            >
              <button
                className={styles.card}
                aria-label={label}
                data-color={showColor ? card.color : undefined}
                data-mine={
                  (isSpymaster && !card.revealed && card.color === props.spymasterTeam) || undefined
                }
                data-revealed={revealed || undefined}
                data-feedback={props.feedback[index] || undefined}
                data-selected={(isSpymaster && highlighted(card, index)) || undefined}
                data-marked={marked || undefined}
                data-cooldown={(marked && cooldown.has(index)) || undefined}
                data-inert={!actionable || undefined}
                data-forbidden={forbidden || undefined}
                disabled={revealed}
                onClick={() => {
                  if (!actionable) return
                  if (isSpymaster) {
                    props.onToggleSelect(index)
                    return
                  }
                  if (props.markBeforeGuess) {
                    if (!marked) {
                      props.onCardMark(index)
                      setCooldown((prev) => new Set(prev).add(index))
                      const timer = setTimeout(() => {
                        setCooldown((prev) => {
                          const next = new Set(prev)
                          next.delete(index)
                          return next
                        })
                        cooldownTimers.current.delete(index)
                      }, 1000)
                      cooldownTimers.current.set(index, timer)
                      return
                    }
                    if (cooldown.has(index)) return
                  }
                  props.onCardClick(index)
                }}
              >
                {props.loading ? (
                  <span className={`${styles.face} ${styles.loading}`} />
                ) : (
                  renderFace(card.face, measureImage)
                )}
                {badge && (
                  <span
                    className={styles.feedback}
                    role="img"
                    aria-label={feedbackBadge[badge].label}
                  >
                    {feedbackBadge[badge].emoji}
                  </span>
                )}
              </button>
              {!props.bare && canMark && (
                <button
                  type="button"
                  className={styles.overlayIcon}
                  data-on={marked || undefined}
                  aria-label={`${marked ? 'Unmark' : 'Mark'} ${name}`}
                  title={`${marked ? 'Unmark' : 'Mark'} ${name}`}
                  onClick={() => props.onCardMark(index)}
                >
                  {props.myTeam === 'red' ? '🟥' : '🔷'}
                </button>
              )}
              {showCaption && card.face.link && (
                <a
                  className={styles.caption}
                  href={card.face.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Look up ${name}`}
                  onClick={(event) => event.stopPropagation()}
                >
                  {card.face.tooltip ?? '?'}
                </a>
              )}
              {showCaption && !card.face.link && zoomUrl && (
                <button
                  type="button"
                  className={styles.caption}
                  aria-label={`Enlarge ${name}`}
                  title={`Enlarge ${name}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    setZoomed(zoomUrl)
                  }}
                >
                  {card.face.tooltip ?? '...'}
                </button>
              )}
              {showCaption && !card.face.link && !zoomUrl && card.face.tooltip && (
                <span className={styles.caption}>{card.face.tooltip}</span>
              )}
              {props.overlay?.(index)}
            </div>
          )
        })}
      </div>
      {zoomed && <ImageLightbox url={zoomed} onClose={() => setZoomed(null)} />}
    </>
  )
}

const feedbackBadge: Record<GuessOutcome, { emoji: string; label: string }> = {
  correct: { emoji: '🎯', label: 'correct guess' },
  wrong: { emoji: '❌', label: 'wrong guess' },
  neutral: { emoji: '🤷', label: 'bystander card' },
  assassin: { emoji: '💀', label: 'assassin' },
}

function renderFace(face: Face, onImageLoad?: (img: HTMLImageElement) => void) {
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
            style={
              face.fit === 'framed' ? ({ '--trim': face.trim ?? 0 } as CSSProperties) : undefined
            }
            src={face.url}
            alt={face.tooltip ?? ''}
            draggable={false}
            onLoad={(event) => onImageLoad?.(event.currentTarget)}
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

function ImageLightbox(props: { url: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  // A native modal dialog gets Escape (and the Android back button) dismissal for free.
  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  return (
    <dialog
      ref={dialog}
      className={styles.lightbox}
      onClose={props.onClose}
      onClick={() => dialog.current?.close()}
    >
      <button
        type="button"
        className={styles.lightboxClose}
        aria-label="Close"
        onClick={() => dialog.current?.close()}
      >
        ✕
      </button>
      <img
        className={styles.lightboxImage}
        src={props.url}
        alt=""
        draggable={false}
        onClick={(event) => event.stopPropagation()}
      />
    </dialog>
  )
}
