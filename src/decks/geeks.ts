import type { Face } from '../Face'
import type { Deck } from './deck'
import { datamuseWords } from './words'
import { shuffle } from '../shuffle'

const dictionaryLink = (word: string): string =>
  `https://en.wiktionary.org/wiki/${encodeURIComponent(word.toLowerCase())}`

export const geeks: Deck = {
  id: 'geeks',
  label: 'Tech Words',
  category: 'words',
  difficulty: 'tough',
  icon: '💻',
  description: 'Programming and tech words',
  source: 'Stack Overflow',
  sourceUrl: 'https://stackoverflow.com',
  fetch,
}

const GEEK_SEEDS = [
  'computer',
  'software',
  'hardware',
  'internet',
  'programming',
  'network',
  'hacker',
  'keyboard',
  'gaming',
  'science',
  'database',
  'security',
]

async function stackOverflowTags(): Promise<string[]> {
  const data = await window
    .fetch(
      'https://api.stackexchange.com/2.3/tags?order=desc&sort=popular&site=stackoverflow&pagesize=100',
    )
    .then((r) => (r.ok ? (r.json() as Promise<{ items?: { name: string }[] }>) : { items: [] }))
    .catch(() => ({ items: [] as { name: string }[] }))
  return [
    ...new Set(
      (data.items ?? [])
        .map((tag) => tag.name.toUpperCase())
        .filter((name) => /^[A-Z]{3,8}$/.test(name)),
    ),
  ]
}

async function fetch(size = 20): Promise<Face[]> {
  const [tagList, dictionary] = await Promise.all([
    stackOverflowTags(),
    datamuseWords(size, GEEK_SEEDS),
  ])
  const sources: [string[], (word: string) => string][] = [
    [
      shuffle(tagList),
      (word) => `https://stackoverflow.com/questions/tagged/${word.toLowerCase()}`,
    ],
    [dictionary, dictionaryLink],
  ]
  const board = new Map<string, string>()
  while (board.size < size && sources.some(([pool]) => pool.length)) {
    for (const [pool, linkFor] of sources) {
      if (board.size >= size) break
      const word = pool.shift()
      if (word && !board.has(word)) board.set(word, linkFor(word))
    }
  }
  return [...board].map(([word, link]) => ({ kind: 'text', text: word, link }))
}
