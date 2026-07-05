import type { CardProvider } from './providers'
import { shuffle } from './words'

// The 280 official Codenames Pictures cards, hotlinked from a fan repo via
// jsDelivr and pinned to a commit so the paths can't shift under us.
const BASE =
  'https://cdn.jsdelivr.net/gh/samdemaeyer/codenames-pictures@a01b650ecc03fb3b9b535659dd046fcc9d4fd167/public/images/cards'

async function fetch(): Promise<string[]> {
  return shuffle(Array.from({ length: 280 }, (_, i) => i))
    .slice(0, 20)
    .map((n) => `${BASE}/card-${n}.jpg`)
}

export const official: CardProvider = {
  id: 'official',
  label: 'Images',
  icon: '🕵️',
  description: 'The official Codenames Pictures cards',
  credit: { label: 'Codenames Pictures', url: 'https://czechgames.com/en/codenames-pictures/' },
  fit: 'framed',
  fetch,
}
