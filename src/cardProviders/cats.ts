import type { CardProvider } from './providers'

interface CatImage {
  url: string
}

// Fetches 20 random cat photos from The Cat API. Throws if no key is configured
// or the request fails, so the caller can fall back to another provider.
async function fetch(): Promise<string[]> {
  const key = import.meta.env.VITE_THECATAPI_KEY
  if (!key) throw new Error('Missing VITE_THECATAPI_KEY')

  const response = await window.fetch(
    'https://api.thecatapi.com/v1/images/search?limit=20',
    { headers: { 'x-api-key': key } },
  )
  if (!response.ok) {
    throw new Error(`The Cat API request failed: ${response.status}`)
  }

  const images = (await response.json()) as CatImage[]
  return images.map((image) => image.url)
}

export const cats: CardProvider = { id: 'cats', label: 'Cats', icon: '🐱', kind: 'image', extra: true, fetch }
