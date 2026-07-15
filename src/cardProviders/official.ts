import type { Face } from '../Face'
import type { CardProvider } from './providers'
import { shuffle } from './words'

export const official: CardProvider = {
  id: 'official',
  label: 'Pictures', group: 'abstract', difficulty: 'casual',
  icon: '🕵️',
  description: 'The official Codenames Pictures cards',
  credit: { label: 'Codenames Pictures', url: 'https://czechgames.com/en/codenames-pictures/' },
  fetch,
}

const BASE =
  'https://cdn.jsdelivr.net/gh/samdemaeyer/codenames-pictures@a01b650ecc03fb3b9b535659dd046fcc9d4fd167/public/images/cards'

async function fetch(): Promise<Face[]> {
  return shuffle(Array.from({ length: 280 }, (_, i) => i))
    .slice(0, 20)
    .map((n) => ({ kind: 'image', url: `${BASE}/card-${n}.jpg`, fit: 'framed', trim: 3.5 }))
}
