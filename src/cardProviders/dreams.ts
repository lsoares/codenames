import type { Face } from '../Face'
import type { CardProvider } from './providers'
import { shuffle } from './words'

export const dreams: CardProvider = {
  id: 'dreams',
  label: 'Dreams', group: 'abstract',
  icon: '💭',
  description: 'GAN-dreamed artworks that never existed',
  credit: { label: 'This Image Does Not Exist', url: 'https://thisimagedoesnotexist.com' },
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
  const ids = shuffle(Array.from({ length: 305 }, (_, i) => i + 1))
  const faces = new Set<string>()
  for (let i = 0; i < ids.length && faces.size < 20; i += 26) {
    const batch = ids.slice(i, i + 26).map((id) => `https://thisimagedoesnotexist.com/images/${id}.jpeg`)
    for (const src of await Promise.all(batch.map(loads))) if (src) faces.add(src)
  }

  if (faces.size < 20) throw new Error('This Image Does Not Exist returned too few images')
  return [...faces].slice(0, 20).map((url) => ({ kind: 'image', url }))
}
