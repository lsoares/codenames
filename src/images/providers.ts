import type { CardProvider } from './types'
import { unsplash } from './unsplash'
import { pexels } from './pexels'
import { words } from './words'
import { tmdb } from './tmdb'
export type { CardProvider }

// The card sources offered in the menu.
export const providers: CardProvider[] = [unsplash, pexels, words, tmdb]

// Fetches 20 card faces (image URLs or words) plus the chosen provider's mode.
// When an image provider throws (missing key, network error), fall back to the
// word board — it needs no key and never fails — so a game can always start.
export async function getFaces(
  providerId: string,
): Promise<{ faces: string[]; mode: CardProvider['kind'] }> {
  const provider = providers.find((p) => p.id === providerId) ?? unsplash
  try {
    return { faces: await provider.fetch(), mode: provider.kind }
  } catch {
    return { faces: await words.fetch(), mode: 'word' }
  }
}
