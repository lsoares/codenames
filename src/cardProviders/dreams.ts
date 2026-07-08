import { image, type Face } from '../Face'
import type { CardProvider } from './providers'
import { shuffle } from './words'

// This Image Does Not Exist has no API. Its GAN-dreamed artworks are published as
// images/<id>.jpeg, with sequential integer ids running 1 to 305 and no holes. We
// still guard each face on load — a card face must never be broken — walking a
// shuffled id list and keeping only the ids that actually decode as an image.
function loads(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(src)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

async function fetch(): Promise<Face[]> {
  const ids = shuffle(Array.from({ length: 305 }, (_, i) => i + 1))
  const faces = new Set<string>()
  for (let i = 0; i < ids.length && faces.size < 20; i += 26) {
    const batch = ids.slice(i, i + 26).map((id) => `https://thisimagedoesnotexist.com/images/${id}.jpeg`)
    for (const src of await Promise.all(batch.map(loads))) if (src) faces.add(src)
  }

  if (faces.size < 20) throw new Error('This Image Does Not Exist returned too few images')
  return [...faces].slice(0, 20).map((url) => image(url))
}

export const dreams: CardProvider = {
  id: 'dreams',
  label: 'Dreams',
  icon: '💭',
  description: 'GAN-dreamed artworks that never existed',
  credit: { label: 'This Image Does Not Exist', url: 'https://thisimagedoesnotexist.com' },
  fetch,
}
