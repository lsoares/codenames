import type { Face } from '../Face'
import type { Deck } from './deck'
import { shuffle } from '../shuffle'

export const pictures: Deck = {
  title: 'Pictures',
  category: 'abstract',
  difficulty: 'casual',
  icon: '🕵️',
  description: 'The official Codenames Pictures cards',
  source: 'Codenames Pictures',
  sourceUrl: 'https://czechgames.com/en/codenames-pictures/',
  fetch,
}

const BASE =
  'https://cdn.jsdelivr.net/gh/samdemaeyer/codenames-pictures@a01b650ecc03fb3b9b535659dd046fcc9d4fd167/public/images/cards'

async function fetch(total = 20): Promise<Face[]> {
  return shuffle(Array.from({ length: 280 }, (_, i) => i))
    .slice(0, total)
    .map((n) => ({ kind: 'image', url: `${BASE}/card-${n}.jpg`, fit: 'framed', trim: 3.5 }))
}
