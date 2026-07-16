import type { Face } from '../Face'
import type { Deck } from './deck'

export const unsplash: Deck = {
  title: 'Random',
  category: 'photos',
  difficulty: 'tough',
  icon: '📷',
  description: 'Random photos from Unsplash',
  source: 'Unsplash',
  sourceUrl: 'https://unsplash.com',
  fetch,
}

interface UnsplashPhoto {
  urls: { small: string; regular: string }
  alt_description: string | null
  links?: { html: string }
}

async function fetch(total = 20): Promise<Face[]> {
  const key = import.meta.env.VITE_UNSPLASH_ACCESS_KEY
  if (!key) throw new Error('Missing VITE_UNSPLASH_ACCESS_KEY')

  const response = await window.fetch(
    `https://api.unsplash.com/photos/random?count=${total}&orientation=landscape&client_id=${key}`,
  )
  if (!response.ok) {
    throw new Error(`Unsplash request failed: ${response.status}`)
  }

  const photos = (await response.json()) as UnsplashPhoto[]
  return photos.map((photo) => ({
    kind: 'image',
    url: photo.urls.small,
    tooltip: photo.alt_description ?? undefined,
    link: photo.links?.html,
  }))
}
