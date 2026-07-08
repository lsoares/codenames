import { image, type Face } from '../Face'
import type { CardProvider } from './providers'

// Picbreeder has no API. Its CPPN-evolved images are published as pre-rendered
// thumbnails at thumbnails/<id>.jpg, with sequential integer ids running 48 to
// 12730. There are rare holes (deleted genomes) that answer with a tiny
// non-decodable body, so we over-pick random ids and keep only the ones that
// actually load as an image — a card face must never be broken.
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
  return [...faces].slice(0, 20).map((url) => image(url, { fit: 'contain' }))
}

export const picbreeder: CardProvider = {
  id: 'picbreeder',
  label: 'Picbreeder',
  icon: '🧬',
  description: 'CPPN-evolved images bred by the Picbreeder community',
  credit: { label: 'Picbreeder', url: 'https://picbreeder.net' },
  fetch,
}
