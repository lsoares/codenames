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

async function fetch(total = 20): Promise<Face[]> {
  const cards = Array.from({ length: 106 }, (_, index) => index + 1)
  return shuffle(cards)
    .slice(0, total)
    .map((number) => ({
      kind: 'image',
      url: `https://dixit.party/cards/dixit/${number}.jpg`,
      tooltip: `Dixit #${number}`,
    }))
}
