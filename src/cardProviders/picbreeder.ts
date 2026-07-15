import type { Face } from '../Face'
import type { CardProvider } from './providers'

export const picbreeder: CardProvider = {
  id: 'picbreeder',
  label: 'Picbreeder',
  group: 'abstract',
  difficulty: 'brutal',
  icon: '🧬',
  description: 'CPPN-evolved images bred by the Picbreeder community',
  source: 'Picbreeder',
  sourceUrl: 'https://picbreeder.net',
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

async function fetch(): Promise<Face[]> {
  const faces = new Set<string>()
  for (let round = 0; round < 5 && faces.size < 20; round++) {
    const batch = Array.from(
      { length: 26 },
      () => `https://picbreeder.net/thumbnails/${Math.floor(Math.random() * 12683) + 48}.jpg`,
    )
    for (const src of await Promise.all(batch.map(loads))) if (src) faces.add(src)
  }

  if (faces.size < 20) throw new Error('Picbreeder returned too few images')
  return [...faces].slice(0, 20).map((url) => ({ kind: 'image', url, fit: 'contain' }))
}
