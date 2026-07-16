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
import { doodles } from './doodles'
import { flags } from './flags'
import { abstract } from './abstract'
import { abstractArt } from './abstractArt'
import { picbreeder } from './picbreeder'
import { dreams } from './dreams'
import { memes } from './memes'
import { icons } from './icons'
import { gcpIcons } from './gcpIcons'
import { carLogos } from './carLogos'
import { albums } from './albums'
import { official } from './official'
import { generated } from './generated'
import { officialWords } from './officialWords'
import { wordsImages } from './wordsAndImages'
import type { Credit } from '../Game'
import type { Deck } from './deck'

export type { Deck }

export const decks: Deck[] = [
  officialWords,
  official,
  generated,
  wordsImages,
  words,
  geeks,
  unsplash,
  pexels,
  abstract,
  picbreeder,
  dreams,
  abstractArt,
  memes,
  things,
  icons,
  gcpIcons,
  carLogos,
  games,
  emojis,
  doodles,
  flags,
  cats,
  dogs,
  foodish,
  albums,
  tmdb,
  pokemon,
]

export const findDeck = (id: string): Deck => decks.find((deck) => deck.id === id) ?? unsplash

export const creditOf = (deck: Deck): Credit | null =>
  deck.source ? { label: deck.source, url: deck.sourceUrl ?? '' } : null
