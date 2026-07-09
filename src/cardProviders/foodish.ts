import { image, type Face } from '../Face'
import type { CardProvider } from './providers'

export const foodish: CardProvider = { id: 'foodish', label: 'Food', icon: '🍔', description: 'Photos of tasty dishes', credit: { label: 'Foodish', url: 'https://foodish-api.com' }, hidden: true, fetch }

interface FoodishImage {
  image: string
}

async function fetch(): Promise<Face[]> {
  const responses = await Promise.all(
    Array.from({ length: 30 }, () =>
      window
        .fetch('https://foodish-api.com/api/')
        .then((r) => (r.ok ? (r.json() as Promise<FoodishImage>) : null))
        .catch(() => null),
    ),
  )

  const faces = [...new Set(responses.flatMap((r) => (r ? [r.image] : [])))]
  if (faces.length < 20) throw new Error('Foodish returned too few images')
  return faces.slice(0, 20).map((url) => {
    const folder = url.split('/').slice(-2)[0] ?? ''
    return image(url, { tooltip: folder.charAt(0).toUpperCase() + folder.slice(1) })
  })
}
