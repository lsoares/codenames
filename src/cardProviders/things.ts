import { image, type Face } from '../Face'
import type { CardProvider } from './providers'
import { shuffle } from './words'

const CATEGORIES = [
  'animal', 'fruit', 'vegetable', 'flower', 'tree', 'vehicle', 'tool', 'instrument',
  'furniture', 'kitchen', 'clothing', 'building', 'sport', 'toy', 'insect', 'bird',
  'fish', 'dessert', 'drink', 'weather', 'landscape', 'gadget', 'jewelry', 'shoe',
]

interface PexelsPhoto {
  src: { medium: string }
}

async function fetch(): Promise<Face[]> {
  const key = import.meta.env.VITE_PEXELS_API_KEY
  if (!key) throw new Error('Missing VITE_PEXELS_API_KEY')

  const categories = shuffle(CATEGORIES).slice(0, 7)
  const page = Math.floor(Math.random() * 5) + 1
  const bodies = await Promise.all(
    categories.map((category) =>
      window
        .fetch(`https://api.pexels.com/v1/search?query=${category}&per_page=4&page=${page}`, {
          headers: { Authorization: key },
        })
        .then((response) => {
          if (!response.ok) throw new Error(`Pexels request failed: ${response.status}`)
          return response.json() as Promise<{ photos: PexelsPhoto[] }>
        }),
    ),
  )

  const faces = [...new Set(shuffle(bodies.flatMap((body) => body.photos)).map((photo) => photo.src.medium))]
  if (faces.length < 20) throw new Error('Pexels returned too few photos')
  return faces.slice(0, 20).map((url) => image(url))
}

export const things: CardProvider = { id: 'things', label: 'Things', icon: '🧩', description: 'Concrete, easily-named everyday objects', credit: { label: 'Pexels', url: 'https://www.pexels.com' }, hidden: true, fetch }
