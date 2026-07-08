import { image, type Face } from '../Face'
import type { CardProvider } from './providers'

interface UnsplashPhoto {
  urls: { small: string; regular: string }
}

// Fetches 20 random photo URLs from Unsplash. Throws if no key is configured
// or the request fails, so the caller can fall back to another provider.
async function fetch(): Promise<Face[]> {
  const key = import.meta.env.VITE_UNSPLASH_ACCESS_KEY
  if (!key) throw new Error('Missing VITE_UNSPLASH_ACCESS_KEY')

  const response = await window.fetch(
    `https://api.unsplash.com/photos/random?count=20&client_id=${key}`,
  )
  if (!response.ok) {
    throw new Error(`Unsplash request failed: ${response.status}`)
  }

  const photos = (await response.json()) as UnsplashPhoto[]
  return photos.map((photo) => image(photo.urls.small))
}

export const unsplash: CardProvider = {
  id: 'unsplash',
  label: 'Random',
  icon: '📷',
  description: 'Random photos from Unsplash',
  credit: { label: 'Unsplash', url: 'https://unsplash.com' },
  fetch,
}
