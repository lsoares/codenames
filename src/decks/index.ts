import { random } from './random'
import { curated } from './curated'
import { wordsPlus } from './wordsPlus'
import { movies } from './movies'
import { cats } from './cats'
import { dogs } from './dogs'
import { foodish } from './foodish'
import { pokemon } from './pokemon'
import { techWords } from './techWords'
import { games } from './games'
import { things } from './things'
import { emojis } from './emojis'
import { doodles } from './doodles'
import { flags } from './flags'
import { photos } from './photos'
import { art } from './art'
import { picbreeder } from './picbreeder'
import { humanOrAi } from './humanOrAi'
import { memes } from './memes'
import { pictograms } from './pictograms'
import { gcpIcons } from './gcpIcons'
import { carLogos } from './carLogos'
import { albumArt } from './albumArt'
import { pictures } from './pictures'
import { picturesPlus } from './picturesPlus'
import { words } from './words'
import { wordsAndPictures, wordsAndPicturesPlus } from './wordsAndPictures'
import type { Credit } from '../Game'
import type { Deck } from './deck'

export type { Deck }

export const decks: Deck[] = [
  words,
  pictures,
  picturesPlus,
  wordsAndPictures,
  wordsAndPicturesPlus,
  wordsPlus,
  techWords,
  random,
  curated,
  photos,
  picbreeder,
  humanOrAi,
  art,
  memes,
  things,
  pictograms,
  gcpIcons,
  carLogos,
  games,
  emojis,
  doodles,
  flags,
  cats,
  dogs,
  foodish,
  albumArt,
  movies,
  pokemon,
]

export const findDeck = (title: string): Deck => {
  const deck = decks.find((deck) => deck.title === title)
  if (!deck) throw new Error(`Deck not found: ${title}`)
  return deck
}

export const creditOf = (deck: Deck): Credit | null =>
  deck.source ? { label: deck.source, url: deck.sourceUrl ?? '' } : null
