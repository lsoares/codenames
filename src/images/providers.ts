import type { ImageProvider } from './types'
import { unsplash } from './unsplash'
import { pexels } from './pexels'
import { offline } from './placeholder'

export type { ImageProvider }

// The image sources offered in the menu. `offline` is last so it also serves as
// the universal fallback.
export const providers: ImageProvider[] = [unsplash, pexels, offline]

// Fetches 20 image URLs from the chosen provider, falling back to offline tiles
// when it throws (missing key, network error) so a game can always start.
export async function getImages(providerId: string): Promise<string[]> {
  const provider = providers.find((p) => p.id === providerId) ?? offline
  try {
    return await provider.fetch()
  } catch {
    return offline.fetch()
  }
}
