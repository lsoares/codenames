import type { Face } from '../Face'
import type { Deck } from './deck'

export const foodish: Deck = {
  title: 'Food',
  category: 'photos',
  difficulty: 'brutal',
  icon: '🍔',
  description: 'Photos of tasty dishes',
  source: 'Foodish',
  sourceUrl: 'https://foodish-api.com',
  fetch,
}

interface FoodishImage {
  image: string
}

async function fetch(total = 20): Promise<Face[]> {
  const responses = await Promise.all(
    Array.from({ length: 30 }, () =>
      window
        .fetch('https://foodish-api.com/api/')
        .then((r) => (r.ok ? (r.json() as Promise<FoodishImage>) : null))
        .catch(() => null),
    ),
  )

  const faces = [...new Set(responses.flatMap((r) => (r ? [r.image] : [])))]
  if (faces.length < total) throw new Error('Foodish returned too few images')
  return faces.slice(0, total).map((url) => {
    const folder = url.split('/').slice(-2)[0] ?? ''
    return { kind: 'image', url, tooltip: folder.charAt(0).toUpperCase() + folder.slice(1) }
  })
}
