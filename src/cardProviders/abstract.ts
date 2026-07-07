import type { CardProvider } from './providers'
import { shuffle } from './words'

const LOOKS = [
  'abstract', 'texture', 'pattern', 'paint', 'macro', 'smoke',
  'bokeh', 'ink', 'marble', 'geometric', 'gradient', 'fractal',
]

interface PexelsPhoto {
  src: { medium: string }
}

async function fetch(): Promise<string[]> {
  const key = import.meta.env.VITE_PEXELS_API_KEY
  if (!key) throw new Error('Missing VITE_PEXELS_API_KEY')

  const looks = shuffle(LOOKS).slice(0, 7)
  const page = Math.floor(Math.random() * 5) + 1
  const bodies = await Promise.all(
    looks.map((look) =>
      window
        .fetch(`https://api.pexels.com/v1/search?query=${look}&per_page=4&page=${page}`, {
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

export const abstract: CardProvider = { id: 'abstract', label: 'Abstract photos', icon: '🌀', description: 'Abstract imagery open to interpretation', credit: { label: 'Pexels', url: 'https://www.pexels.com' }, fetch }
