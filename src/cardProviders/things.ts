import type { Face } from '../Face'
import type { CardProvider } from './providers'
import { shuffle } from './words'

export const things: CardProvider = { id: 'things', label: 'Things', group: 'photos', icon: '🧩', description: 'Concrete, easily-named everyday objects', credit: { label: 'Pexels', url: 'https://www.pexels.com' }, fetch }

const CATEGORIES = [
  'animal', 'fruit', 'vegetable', 'flower', 'tree', 'vehicle', 'tool', 'instrument',
  'furniture', 'kitchen', 'clothing', 'building', 'sport', 'toy', 'insect', 'bird',
  'fish', 'dessert', 'drink', 'weather', 'landscape', 'gadget', 'jewelry', 'shoe',
]

interface PexelsPhoto {
  src: { medium: string }
  alt: string
  url: string
}

async function fetch(): Promise<Face[]> {
  const key = import.meta.env.VITE_PEXELS_API_KEY
  if (!key) throw new Error('Missing VITE_PEXELS_API_KEY')

  const categories = shuffle(CATEGORIES).slice(0, 7)
  const page = Math.floor(Math.random() * 5) + 1
  const bodies = await Promise.all(
    categories.map((category) =>
      window
        .fetch(`https://api.pexels.com/v1/search?query=${category}&orientation=landscape&per_page=4&page=${page}`, {
          headers: { Authorization: key },
        })
        .then((response) => {
          if (!response.ok) throw new Error(`Pexels request failed: ${response.status}`)
          return response.json() as Promise<{ photos: PexelsPhoto[] }>
        }),
    ),
  )

  const seen = new Set<string>()
  const photos = shuffle(bodies.flatMap((body) => body.photos)).filter((photo) => {
    const fresh = !seen.has(photo.src.medium)
    seen.add(photo.src.medium)
    return fresh
  })
  if (photos.length < 20) throw new Error('Pexels returned too few photos')
  return photos
    .slice(0, 20)
    .map((photo) => ({ kind: 'image', url: photo.src.medium, tooltip: photo.alt || undefined, link: photo.url }))
}
