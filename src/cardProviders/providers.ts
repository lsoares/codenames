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
import { picbreeder } from './picbreeder'
import { mix } from './mix'
import { icons } from './icons'
import { official } from './official'
import { officialWords } from './officialWords'
import type { CardFit, Credit } from '../Game'

// A source of card faces. `fetch` resolves to 20 faces — image URLs or words — or
// throws when it can't (missing key, network error) so callers can fall back.
export interface CardProvider {
  id: string
  label: string
  icon: string // emoji shown on the deck-picker tile
  description: string // shown as the tile's hover tooltip
  credit?: Credit // deck-source attribution shown on the board; omitted for local decks
  fit?: CardFit // how its image faces fill a card; defaults to 'cover'
  fetch: () => Promise<string[]>
}

// The first four are the picker's headline decks; the rest sit behind its "more"
// reveal, so order matters.
export const providers: CardProvider[] = [officialWords, official, words, geeks, unsplash, pexels, abstract, picbreeder, things, icons, tmdb, games, emojis, cats, foodish, pokemon, mix]

// Fetches 20 card faces plus the deck's credit. When a provider throws (missing
// key, network error), fall back to the word board — no key, never fails — so a
// game can always start.
export async function getFaces(
  providerId: string,
): Promise<{ faces: string[]; credit: Credit | null; fit: CardFit; deck: string }> {
  const provider = providers.find((p) => p.id === providerId) ?? unsplash
  try {
    return { faces: await provider.fetch(), credit: provider.credit ?? null, fit: provider.fit ?? 'cover', deck: provider.label }
  } catch {
    return { faces: await officialWords.fetch(), credit: officialWords.credit ?? null, fit: 'cover', deck: officialWords.label }
  }
}
