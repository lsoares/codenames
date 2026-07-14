import { unsplash } from './unsplash'
import { pexels } from './pexels'
import { words } from './words'
import { tmdb } from './tmdb'
import { cats } from './cats'
import { dogs } from './dogs'
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
import { memes } from './memes'
import { mix } from './mix'
import { icons } from './icons'
import { gcpIcons } from './gcpIcons'
import { carLogos } from './carLogos'
import { official } from './official'
import { officialWords } from './officialWords'
import type { Face } from '../Face'
import type { Credit } from '../Game'

export interface CardProvider {
  id: string
  label: string
  icon: string
  description: string
  credit?: Credit
  hidden?: boolean
  fetch: () => Promise<Face[]>
}

export const providers: CardProvider[] = [officialWords, official, words, geeks, unsplash, pexels, abstract, abstractArt, picbreeder, dreams, memes, things, icons, gcpIcons, carLogos, games, emojis, flags, cats, dogs, foodish, tmdb, pokemon, mix]

export async function getFaces(
  providerId: string,
): Promise<{ faces: Face[]; credit: Credit | null; deck: string }> {
  const provider = providers.find((p) => p.id === providerId) ?? unsplash
  return { faces: await provider.fetch(), credit: provider.credit ?? null, deck: provider.label }
}
