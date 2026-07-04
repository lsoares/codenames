import type { CardProvider } from './providers'
import { shuffle } from './words'

// Concrete, photographable things — the kind of single, easily-named object that
// makes a first-degree Codenames connection (fruit → apple + banana). A board
// draws a handful of these categories and pulls a few photos from each, so the
// 20 cards stay varied rather than 20 near-identical shots of one subject.
const CATEGORIES = [
  'animal', 'fruit', 'vegetable', 'flower', 'tree', 'vehicle', 'tool', 'instrument',
  'furniture', 'kitchen', 'clothing', 'building', 'sport', 'toy', 'insect', 'bird',
  'fish', 'dessert', 'drink', 'weather', 'landscape', 'gadget', 'jewelry', 'shoe',
]

interface PexelsPhoto {
  src: { medium: string }
}

// Searches Pexels for a few random concrete categories and keeps a handful of
// photos from each. Reuses the Pexels deck's key; throws when it's missing, the
// request fails, or too few distinct photos come back, so the caller can fall
// back to another provider.
async function fetch(): Promise<string[]> {
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
  return faces.slice(0, 20)
}

export const things: CardProvider = { id: 'things', label: 'Things', icon: '🧩', kind: 'image', fetch }
