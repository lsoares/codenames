import { unsplash } from './unsplash'
import { pexels } from './pexels'
import { words } from './words'
import { tmdb } from './tmdb'
import { cats } from './cats'
import { foodish } from './foodish'
import { pokemon } from './pokemon'
import { geeks } from './geeks'
import { games } from './games'

// A source of card faces. `fetch` resolves to 20 faces — image URLs for
// `kind: 'image'` providers, or words for `kind: 'word'` — or throws when it
// can't (missing key, network error) so callers can fall back.
export interface CardProvider {
  id: string
  label: string
  icon: string // emoji shown on the deck-picker tile
  kind: 'image' | 'word'
  fetch: () => Promise<string[]>
}

// The card sources offered in the menu.
export const providers: CardProvider[] = [words, geeks, unsplash, pexels, tmdb, games, cats, foodish, pokemon]

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
