import type { CardProvider } from './providers'

interface FoodishImage {
  image: string
}

// Fetches 20 random food photos from Foodish. Each call returns a single image,
// so we fire a batch in parallel and dedupe — plated dishes make vivid, easily
// named card faces. Throws if too few come back (network error) so the caller
// can fall back to another provider. No key required.
async function fetch(): Promise<string[]> {
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
  return faces.slice(0, 20)
}

export const foodish: CardProvider = { id: 'foodish', label: 'Food', icon: '🍔', kind: 'image', fetch }
