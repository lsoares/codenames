import { image, type Face } from '../Face'
import type { CardProvider } from './providers'

export const cats: CardProvider = { id: 'cats', label: 'Cats', icon: '🐱', description: 'Random cat photos', credit: { label: 'The Cat API', url: 'https://thecatapi.com' }, hidden: true, fetch }

interface CatImage {
  url: string
}

async function fetch(): Promise<Face[]> {
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
  return images.map((cat) => image(cat.url))
}
