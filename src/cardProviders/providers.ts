import { unsplash } from './unsplash'
import { pexels } from './pexels'
import { words } from './words'
import { tmdb } from './tmdb'
import { cats } from './cats'
import { foodish } from './foodish'
import { pokemon } from './pokemon'
import { geeks } from './geeks'
import { games } from './games'
import { things } from './things'
import { emojis } from './emojis'
import { abstract } from './abstract'
import { icons } from './icons'
import type { Credit } from '../Game'

// A source of card faces. `fetch` resolves to 20 faces — image URLs or words — or
// throws when it can't (missing key, network error) so callers can fall back.
export interface CardProvider {
  id: string
  label: string
  icon: string // emoji shown on the deck-picker tile
  description: string // shown as the tile's hover tooltip
  credit?: Credit // deck-source attribution shown on the board; omitted for local decks
  fetch: () => Promise<string[]>
}

// The first four are the picker's headline decks; the rest sit behind its "more"
// reveal, so order matters.
export const providers: CardProvider[] = [words, unsplash, pexels, abstract, things, icons, tmdb, geeks, games, emojis, cats, foodish, pokemon]

// Fetches 20 card faces plus the deck's credit. When a provider throws (missing
// key, network error), fall back to the word board — no key, never fails — so a
// game can always start.
export async function getFaces(
  providerId: string,
): Promise<{ faces: string[]; credit: Credit | null }> {
  const provider = providers.find((p) => p.id === providerId) ?? unsplash
  try {
    return { faces: await provider.fetch(), credit: provider.credit ?? null }
  } catch {
    return { faces: await words.fetch(), credit: words.credit ?? null }
  }
}
