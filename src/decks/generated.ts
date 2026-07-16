import type { Face } from '../Face'
import type { Deck } from './deck'
import { shuffle } from '../shuffle'

export const generated: Deck = {
  id: 'generated',
  label: 'Pictures+',
  group: 'abstract',
  difficulty: 'casual',
  icon: '🗿',
  description: 'AI-drawn cards that fuse two unrelated things into one picture',
  source: 'Stable Diffusion XL',
  sourceUrl: 'https://stability.ai/stable-diffusion',
  fetch,
}

const BASE = '/generated-cards'

async function fetch(total = 20): Promise<Face[]> {
  return shuffle(Array.from({ length: 184 }, (_, i) => i))
    .slice(0, total)
    .map((n) => ({ kind: 'image', url: `${BASE}/card-${n}.png`, fit: 'framed', trim: 3.5 }))
}
