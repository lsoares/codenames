import type { Face } from '../Face'
import { boardSize, type Composition } from '../Game'
import type { Deck } from './deck'
import { shuffle } from '../shuffle'

const WORDS = [
  'APPLE',
  'RIVER',
  'TOWER',
  'ENGINE',
  'ROBOT',
  'CASTLE',
  'PLANET',
  'GUITAR',
  'ANCHOR',
  'DRAGON',
  'ROCKET',
  'BRIDGE',
  'CACTUS',
  'VIOLIN',
  'MAGNET',
  'PYRAMID',
  'COMPASS',
  'LANTERN',
  'HELMET',
  'HARBOR',
  'GLACIER',
  'VOLCANO',
  'ORCHID',
  'SATURN',
  'PENGUIN',
  'WALNUT',
  'TROPHY',
  'KETTLE',
  'MEADOW',
  'CANYON',
  'BEACON',
  'TURBINE',
  'DIAMOND',
  'FEATHER',
  'PARROT',
  'SADDLE',
  'WINDMILL',
  'TELESCOPE',
  'HAMMOCK',
  'THRONE',
]

// Half the board is words, the rest are the local generated pictures — a genuine
// mix, so a clue has to work for both a word and a picture at once.
const deal = (composition?: Composition): Face[] => {
  const total = boardSize(composition)
  const words = total - Math.floor(total / 2)
  const wordFaces: Face[] = shuffle(WORDS)
    .slice(0, words)
    .map((text) => ({ kind: 'text', text }))
  const imageFaces: Face[] = shuffle(Array.from({ length: 184 }, (_, i) => i))
    .slice(0, total - words)
    .map((n) => ({
      kind: 'image',
      url: `/generated-cards/card-${n}.png`,
      fit: 'framed',
      trim: 3.5,
    }))
  return shuffle([...wordFaces, ...imageFaces])
}

export const wordsImages: Deck = {
  id: 'words-images',
  label: 'Words + Images 5×4',
  group: 'abstract',
  difficulty: 'tough',
  icon: '🃏',
  description: 'Words and pictures mixed on the 5×4 grid — clues must fit both',
  fetch: async () => deal(),
}

const CLASSIC: Composition = { startingAgents: 9, otherAgents: 8, neutrals: 7, assassins: 1 }

export const wordsImagesXl: Deck = {
  id: 'words-images-xl',
  label: 'Words + Images 5×5',
  group: 'abstract',
  difficulty: 'tough',
  icon: '🃏',
  description: 'Words and pictures mixed on the classic 5×5 grid — clues must fit both',
  composition: CLASSIC,
  fetch: async () => deal(CLASSIC),
}
