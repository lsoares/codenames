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

const FIRST_CARD = 1
const LAST_CARD = 106

const cardUrl = (number: number): string => `https://dixit.party/cards/dixit/${number}.jpg`

async function fetch(total = 20): Promise<Face[]> {
  const cards = Array.from({ length: LAST_CARD - FIRST_CARD + 1 }, (_, index) => FIRST_CARD + index)
  return shuffle(cards)
    .slice(0, total)
    .map((number) => ({ kind: 'image', url: cardUrl(number), tooltip: `Dixit #${number}` }))
}
