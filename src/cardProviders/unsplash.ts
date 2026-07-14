import type { Face } from '../Face'
import type { CardProvider } from './providers'

export const unsplash: CardProvider = {
  id: 'unsplash',
  label: 'Random', group: 'photos',
  icon: '📷',
  description: 'Random photos from Unsplash',
  credit: { label: 'Unsplash', url: 'https://unsplash.com' },
  fetch,
}

interface UnsplashPhoto {
  urls: { small: string; regular: string }
  alt_description: string | null
  links?: { html: string }
}

async function fetch(): Promise<Face[]> {
  const key = import.meta.env.VITE_UNSPLASH_ACCESS_KEY
  if (!key) throw new Error('Missing VITE_UNSPLASH_ACCESS_KEY')

  const response = await window.fetch(
    `https://api.unsplash.com/photos/random?count=20&orientation=landscape&client_id=${key}`,
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
