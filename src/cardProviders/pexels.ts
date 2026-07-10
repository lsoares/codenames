import type { Face } from '../Face'
import type { CardProvider } from './providers'

export const pexels: CardProvider = { id: 'pexels', label: 'Curated', icon: '🖼️', description: 'Curated editorial photos from Pexels', credit: { label: 'Pexels', url: 'https://www.pexels.com' }, fetch }

interface PexelsPhoto {
  src: { landscape: string }
  alt: string
  url: string
}

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
  return photos.map((photo) => ({ kind: 'image', url: photo.src.landscape, tooltip: photo.alt || undefined, link: photo.url }))
}
