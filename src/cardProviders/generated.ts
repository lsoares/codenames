import type { Face } from '../Face'
import type { CardProvider } from './providers'
import { shuffle } from './words'

export const generated: CardProvider = {
  id: 'generated',
  label: 'Pictures+', group: 'abstract', difficulty: 'casual',
  icon: '🗿',
  description: 'AI-drawn cards that fuse two unrelated things into one picture',
  credit: { label: 'Stable Diffusion XL', url: 'https://stability.ai/stable-diffusion' },
  fetch,
}

const BASE = '/generated-cards'

async function fetch(): Promise<Face[]> {
  return shuffle(Array.from({ length: 184 }, (_, i) => i))
    .slice(0, 20)
    .map((n) => ({ kind: 'image', url: `${BASE}/card-${n}.png`, fit: 'framed', trim: 3.5 }))
}
