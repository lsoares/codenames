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
import { flags } from './flags'
import { abstract } from './abstract'
import { abstractArt } from './abstractArt'
import { picbreeder } from './picbreeder'
import { dreams } from './dreams'
import { mix } from './mix'
import { icons } from './icons'
import { official } from './official'
import { officialWords } from './officialWords'
import type { Face } from '../Face'
import type { Credit } from '../Game'

// A source of card faces. `fetch` resolves to 20 faces — text, photos, or icons,
// each declaring its own kind — or throws when it can't (missing key, network
// error) so callers can fall back.
export interface CardProvider {
  id: string
  label: string
  icon: string // emoji shown on the deck-picker tile
  description: string // shown as the tile's hover tooltip
  credit?: Credit // deck-source attribution shown on the board; omitted for local decks
  hidden?: boolean // a long-tail deck, tucked behind the picker's "+" until opened
  fetch: () => Promise<Face[]>
}

// The first four are the picker's headline decks; the rest sit behind its "more"
// reveal, so order matters.
export const providers: CardProvider[] = [officialWords, official, words, geeks, unsplash, pexels, abstract, abstractArt, picbreeder, dreams, things, icons, tmdb, games, emojis, flags, cats, foodish, pokemon, mix]

// Fetches 20 card faces plus the deck's credit. When a provider throws (missing
// key, network error), fall back to the word board — no key, never fails — so a
// game can always start.
export async function getFaces(
  providerId: string,
): Promise<{ faces: Face[]; credit: Credit | null; deck: string }> {
  const provider = providers.find((p) => p.id === providerId) ?? unsplash
  try {
    return { faces: await provider.fetch(), credit: provider.credit ?? null, deck: provider.label }
  } catch {
    return { faces: await officialWords.fetch(), credit: officialWords.credit ?? null, deck: officialWords.label }
  }
}
