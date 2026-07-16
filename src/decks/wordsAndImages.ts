import type { Face } from '../Face'
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

export const wordsImages: Deck = {
  id: 'words-images',
  label: 'Words + Images',
  category: 'abstract',
  difficulty: 'tough',
  icon: '🃏',
  description: 'Words and pictures mixed on the grid - clues must fit both',
  fetch: async (total = 20) => {
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
  },
}
