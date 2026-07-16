import type { Face } from '../Face'
import type { Deck } from './deck'

export const curated: Deck = {
  title: 'Curated',
  category: 'photos',
  difficulty: 'tough',
  icon: '🖼️',
  description: 'Curated editorial photos from Pexels',
  source: 'Pexels',
  sourceUrl: 'https://www.pexels.com',
  fetch,
}

interface PexelsPhoto {
  src: { landscape: string }
  url: string
}

async function fetch(total = 20): Promise<Face[]> {
  const key = import.meta.env.VITE_PEXELS_API_KEY
  if (!key) throw new Error('Missing VITE_PEXELS_API_KEY')

  const page = Math.floor(Math.random() * 50) + 1
  const response = await window.fetch(
    `https://api.pexels.com/v1/curated?per_page=${total}&page=${page}`,
    { headers: { Authorization: key } },
  )
  if (!response.ok) {
    throw new Error(`Pexels request failed: ${response.status}`)
  }

  const { photos } = (await response.json()) as { photos: PexelsPhoto[] }
  return photos.map((photo) => ({
    kind: 'image',
    url: photo.src.landscape,
    tooltip: titleFromUrl(photo.url),
    link: photo.url,
  }))
}

function titleFromUrl(url: string): string | undefined {
  const slug = url.replace(/\/$/, '').split('/').pop()?.replace(/-\d+$/, '')
  if (!slug) return undefined
  const words = slug.replace(/-/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}
