import { getDefinitionUrl, type Face } from '../Face'
import type { Deck } from './deck'
import { shuffle } from '../shuffle'

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

export const wordsPlus: Deck = {
  title: 'Words+',
  category: 'words',
  difficulty: 'casual',
  icon: '🔤',
  description: 'Fresh everyday nouns generated from Datamuse',
  source: 'Datamuse',
  sourceUrl: 'https://www.datamuse.com/api/',
  fetch: (total = 20): Promise<Face[]> =>
    datamuseWords(total).then((words) =>
      words.map((word) => ({ kind: 'text', text: word, link: getDefinitionUrl(word) })),
    ),
}

const SEEDS = [
  'animal',
  'food',
  'kitchen',
  'sport',
  'vehicle',
  'tool',
  'fruit',
  'house',
  'ocean',
  'space',
  'music',
  'plant',
  'weather',
  'building',
  'insect',
  'bird',
  'clothes',
  'farm',
  'forest',
  'jungle',
  'desert',
  'mountain',
  'castle',
  'pirate',
  'monster',
  'circus',
  'garden',
  'winter',
  'beach',
  'dinosaur',
  'robot',
  'treasure',
  'candy',
  'toy',
  'zoo',
  'camping',
  'bakery',
  'city',
  'fish',
  'holiday',
]

interface DatamuseWord {
  word: string
  tags?: string[]
}

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
