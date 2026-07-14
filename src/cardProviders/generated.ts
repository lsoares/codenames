import type { Face } from '../Face'
import type { CardProvider } from './providers'
import { shuffle } from './words'

export const generated: CardProvider = {
  id: 'generated',
  label: 'Dreamed', group: 'abstract',
  icon: '🔮',
  description: 'AI-dreamed cards that each blend unrelated things into one scene',
  credit: { label: 'Generated with gpt-image-1', url: 'https://platform.openai.com/docs/guides/image-generation' },
  hidden: true,
  fetch,
}

const BASE = 'https://cdn.jsdelivr.net/gh/USER/REPO@COMMIT/generated-cards/card'

async function fetch(): Promise<Face[]> {
  return shuffle(Array.from({ length: 280 }, (_, i) => i))
    .slice(0, 20)
    .map((n) => ({ kind: 'image', url: `${BASE}-${n}.png`, fit: 'framed', trim: 3.5 }))
}
