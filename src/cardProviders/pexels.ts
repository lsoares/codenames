import { image, type Face } from '../Face'
import type { CardProvider } from './providers'

interface PexelsPhoto {
  src: { medium: string; small: string }
}

// Fetches 20 curated photo URLs from Pexels. A random page keeps successive
// games from repeating. Throws if no key is configured or the request fails,
// so the caller can fall back to another provider.
async function fetch(): Promise<Face[]> {
  const key = import.meta.env.VITE_PEXELS_API_KEY
  if (!key) throw new Error('Missing VITE_PEXELS_API_KEY')

  const page = Math.floor(Math.random() * 50) + 1
  const response = await window.fetch(
    `https://api.pexels.com/v1/curated?per_page=20&page=${page}`,
    { headers: { Authorization: key } },
  )
  if (!response.ok) {
    throw new Error(`Pexels request failed: ${response.status}`)
  }

  const { photos } = (await response.json()) as { photos: PexelsPhoto[] }
  return photos.map((photo) => image(photo.src.medium))
}

export const pexels: CardProvider = { id: 'pexels', label: 'Curated', icon: '🖼️', description: 'Curated editorial photos from Pexels', credit: { label: 'Pexels', url: 'https://www.pexels.com' }, fetch }
