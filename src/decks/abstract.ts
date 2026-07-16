import type { Face } from '../Face'
import type { Deck } from './deck'
import { shuffle } from '../shuffle'

export const abstract: Deck = {
  title: 'Photos',
  category: 'abstract',
  difficulty: 'brutal',
  icon: '🌀',
  description: 'Abstract imagery open to interpretation',
  source: 'Pexels',
  sourceUrl: 'https://www.pexels.com',
  fetch,
}

const LOOKS = [
  'abstract',
  'texture',
  'pattern',
  'paint',
  'macro',
  'smoke',
  'bokeh',
  'ink',
  'marble',
  'geometric',
  'gradient',
  'fractal',
]

interface PexelsPhoto {
  src: { medium: string }
  url: string
}

async function fetch(total = 20): Promise<Face[]> {
  const key = import.meta.env.VITE_PEXELS_API_KEY
  if (!key) throw new Error('Missing VITE_PEXELS_API_KEY')

  const looks = shuffle(LOOKS).slice(0, 7)
  const page = Math.floor(Math.random() * 5) + 1
  const bodies = await Promise.all(
    looks.map((look) =>
      window
        .fetch(
          `https://api.pexels.com/v1/search?query=${look}&orientation=landscape&per_page=4&page=${page}`,
          {
            headers: { Authorization: key },
          },
        )
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
  if (photos.length < total) throw new Error('Pexels returned too few photos')
  return photos
    .slice(0, total)
    .map((photo) => ({ kind: 'image', url: photo.src.medium, link: photo.url }))
}
