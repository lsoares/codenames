import type { Face } from '../Face'
import type { Deck } from './deck'
import { shuffle } from '../shuffle'

export const humanOrAi: Deck = {
  title: 'Human or AI?',
  category: 'abstract',
  difficulty: 'tough',
  icon: '🤖',
  description: 'A mix of human art and AI-generated images',
  source: 'This Image Does Not Exist',
  sourceUrl: 'https://thisimagedoesnotexist.com',
  fetch,
}

function loads(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(src)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

async function fetch(total = 20): Promise<Face[]> {
  const ids = shuffle(Array.from({ length: 305 }, (_, i) => i + 1))
  const faces = new Set<string>()
  for (let i = 0; i < ids.length && faces.size < total; i += 26) {
    const batch = ids
      .slice(i, i + 26)
      .map((id) => `https://thisimagedoesnotexist.com/images/${id}.jpeg`)
    for (const src of await Promise.all(batch.map(loads))) if (src) faces.add(src)
  }

  if (faces.size < total) throw new Error('This Image Does Not Exist returned too few images')
  return [...faces].slice(0, total).map((url) => ({ kind: 'image', url }))
}
