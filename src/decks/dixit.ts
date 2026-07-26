import type { Face } from '../Face'
import type { Deck } from './deck'
import { shuffle } from '../shuffle'

export const dixit: Deck = {
  title: 'Dixit',
  category: 'culture',
  difficulty: 'brutal',
  icon: '🐇',
  description: 'Dreamlike Dixit illustrations, open to endless interpretation',
  source: 'dixit.party',
  sourceUrl: 'https://dixit.party',
  fetch,
}

const cardUrl = (number: number): string => `https://dixit.party/cards/dixit/${number}.jpg`

const SCAN_BATCH = 30
const HIGHEST_CANDIDATE = 2000

function loads(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve(true)
    image.onerror = () => resolve(false)
    image.src = url
  })
}

async function enumeratePublishedCards(): Promise<number[]> {
  const published: number[] = []
  for (let first = 1; first <= HIGHEST_CANDIDATE; first += SCAN_BATCH) {
    const candidates = Array.from({ length: SCAN_BATCH }, (_, offset) => first + offset)
    const present = await Promise.all(candidates.map((number) => loads(cardUrl(number))))
    const hits = candidates.filter((_, index) => present[index])
    published.push(...hits)
    if (hits.length === 0 && (published.length > 0 || first > SCAN_BATCH * 2)) break
  }
  return published
}

let publishedCards: Promise<number[]> | null = null

async function fetch(total = 20): Promise<Face[]> {
  const cards = await (publishedCards ??= enumeratePublishedCards())
  if (cards.length < total) throw new Error('Dixit published too few cards')
  return shuffle(cards)
    .slice(0, total)
    .map((number) => ({ kind: 'image', url: cardUrl(number), tooltip: `Dixit #${number}` }))
}
