import type { Face } from '../Face'
import type { Deck } from './providers'

export const doodles: Deck = {
  id: 'doodles',
  label: 'Doodles',
  group: 'symbols',
  difficulty: 'casual',
  icon: '🖍️',
  description: 'Hand-drawn open-source emoji from the whole OpenMoji set',
  source: 'OpenMoji',
  sourceUrl: 'https://openmoji.org',
  fetch,
}

interface Entry {
  emoji: string
  hexcode: string
  group: string
  subgroups: string
  skintone: string
  annotation: string
}

// Every group is in play, but weighted so the concrete, recognisable things a kid
// would doodle come up far more than signs and landmarks. Weight 0 drops a group:
// the A–Z regional-indicator letters and skin-tone/hair components aren't pictures
// of anything. Prune individual duds by hexcode via SKIP.
const WEIGHT: Record<string, number> = {
  'animals-nature': 6,
  'food-drink': 6,
  objects: 4,
  activities: 3,
  'travel-places': 2,
  'people-body': 2,
  'extras-openmoji': 2,
  'smileys-emotion': 1,
  symbols: 1,
  flags: 0.5,
  'extras-unicode': 0,
  component: 0,
}
const SKIP: ReadonlySet<string> = new Set<string>([])

async function fetch(): Promise<Face[]> {
  // The npm package ships the catalogue metadata; the raster PNGs (which, unlike
  // the viewBox-only SVGs, carry intrinsic dimensions so they render in an <img>)
  // live in the GitHub repo. Both are served by jsdelivr.
  const version = '15.0.0'
  const response = await window.fetch(
    `https://cdn.jsdelivr.net/npm/openmoji@${version}/data/openmoji.json`,
  )
  const all: Entry[] = await response.json()
  const pool = all.filter(
    (entry) =>
      weightOf(entry) > 0 &&
      !SKIP.has(entry.hexcode) &&
      !entry.skintone &&
      isSingleGlyph(entry.emoji),
  )
  return pickWeighted(pool, 20).map((entry) => ({
    kind: 'image',
    url: `https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@${version}/color/618x618/${entry.hexcode}.png`,
    fit: 'contain',
    tooltip: entry.annotation,
    link: `https://openmoji.org/library/emoji-${entry.hexcode}/`,
  }))
}

// One drawn glyph: a lone codepoint, or a codepoint plus the FE0F emoji-style
// selector. Multi-codepoint sequences (families, flags, professions) are skipped.
function isSingleGlyph(emoji: string): boolean {
  const points = [...emoji]
  return points.length === 1 || (points.length === 2 && points[1].codePointAt(0) === 0xfe0f)
}

// Group weight, but the coloured geometric shapes (circles, squares, triangles)
// are damped well below the rest of the symbols group — they read as duds far
// more than the arrows, zodiac or av-symbols alongside them.
function weightOf(entry: Entry): number {
  if (entry.subgroups === 'geometric') return 0.2
  return WEIGHT[entry.group] ?? 1
}

// Weighted sampling without replacement (Efraimidis–Spirakis): each entry gets a
// key random^(1/weight), and the highest keys win, so heavier groups surface more
// often while every eligible emoji stays reachable.
function pickWeighted(pool: Entry[], count: number): Entry[] {
  return pool
    .map((entry) => ({ entry, key: Math.random() ** (1 / weightOf(entry)) }))
    .sort((a, b) => b.key - a.key)
    .slice(0, count)
    .map((scored) => scored.entry)
}
