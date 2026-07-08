import { text, type Face } from '../Face'
import type { CardProvider } from './providers'

// Concrete, picturable categories. Datamuse's "triggered by" (rel_trg) returns
// words statistically associated with these, which yields Codenames-ish nouns
// (kitchen → stove, sink, oven, knife) far better than random dictionary words.
const SEEDS = [
  'animal', 'food', 'kitchen', 'sport', 'vehicle', 'tool', 'fruit', 'house',
  'ocean', 'space', 'music', 'plant', 'weather', 'building', 'insect', 'bird',
  'clothes', 'farm', 'forest', 'jungle', 'desert', 'mountain', 'castle', 'pirate',
  'monster', 'circus', 'garden', 'winter', 'beach', 'dinosaur', 'robot', 'treasure',
  'candy', 'toy', 'zoo', 'camping', 'bakery', 'city', 'fish', 'holiday',
]

interface DatamuseWord {
  word: string
  tags?: string[]
}

// A word card's ↗ links to its dictionary entry, for players who don't know it.
// Phrases and proper nouns (NEW YORK, LOCH NESS) may 404 — an acceptable miss.
export const dictionaryLink = (word: string): string =>
  `https://www.merriam-webster.com/dictionary/${encodeURIComponent(word.toLowerCase())}`

export const shuffle = <T>(items: T[]): T[] => {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// Keep common, single, picturable nouns; drop proper nouns, rare words, and
// plurals whose singular is already in the pool.
function usable(entry: DatamuseWord, seen: Set<string>): string | null {
  const tags = entry.tags ?? []
  const freq = Number(tags.find((t) => t.startsWith('f:'))?.slice(2) ?? 0)
  const word = entry.word.toUpperCase()
  if (!tags.includes('n') || tags.includes('prop')) return null
  if (!/^[A-Z]{3,8}$/.test(word)) return null
  if (freq < 3) return null
  if (seen.has(word)) return null
  if (word.endsWith('S') && seen.has(word.slice(0, -1))) return null
  return word
}

// Fetches picturable nouns from Datamuse, triggered by a handful of category
// seeds, and returns up to `count` distinct board-ready words. Whatever the live
// source gives back is what a game gets — no curated padding. Each seed request
// swallows its own failure, so a flaky network yields fewer words rather than
// throwing. Exported (with a swappable seed pool) so the geek board can trigger
// tech-flavoured words off the same mechanism.
export async function datamuseWords(count = 20, pool = SEEDS): Promise<string[]> {
  const seen = new Set<string>()
  const seeds = shuffle(pool).slice(0, 6)
  const responses = await Promise.all(
    seeds.map((seed) =>
      window
        .fetch(`https://api.datamuse.com/words?rel_trg=${seed}&md=fp&max=40`)
        .then((r) => (r.ok ? (r.json() as Promise<DatamuseWord[]>) : []))
        .catch(() => [] as DatamuseWord[]),
    ),
  )
  for (const entry of shuffle(responses.flat())) {
    const word = usable(entry, seen)
    if (word) seen.add(word)
    if (seen.size >= count) break
  }
  return [...seen]
}

export const words: CardProvider = {
  id: 'words',
  label: 'Words+',
  icon: '🔤',
  description: 'Fresh everyday nouns generated from Datamuse',
  credit: { label: 'Datamuse', url: 'https://www.datamuse.com/api/' },
  fetch: (): Promise<Face[]> =>
    datamuseWords().then((words) => words.map((word) => text(word, { link: dictionaryLink(word) }))),
}
