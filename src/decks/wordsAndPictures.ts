import type { Deck } from './deck'
import { shuffle } from '../shuffle'
import { datamuseWords } from './wordsPlus'
import { words } from './words'
import { pictures } from './pictures'

export const wordsAndPictures: Deck = {
  title: 'Words & Pictures',
  category: 'abstract',
  difficulty: 'casual',
  icon: '🃏',
  description: 'Official words and pictures mixed on the grid',
  source: 'DarkTwinge + Codenames Pictures',
  fetch: async (total = 20) => {
    const wordCount = total - Math.floor(total / 2)
    const [wordFaces, imageFaces] = await Promise.all([
      words.fetch(wordCount),
      pictures.fetch(total - wordCount),
    ])
    return shuffle([...wordFaces, ...imageFaces])
  },
}

export const wordsAndPicturesPlus: Deck = {
  title: 'Words+ & Pictures+',
  category: 'abstract',
  difficulty: 'casual',
  icon: '🃏',
  description: 'Datamuse words and generated pictures mixed on the grid',
  source: 'Datamuse + Pictures+',
  fetch: async (total = 20) => {
    const wordCount = total - Math.floor(total / 2)
    const wordFaces = (await datamuseWords(wordCount)).map((text) => ({
      kind: 'text' as const,
      text,
    }))
    const imageFaces = shuffle(Array.from({ length: 184 }, (_, i) => i))
      .slice(0, total - wordCount)
      .map((n) => ({
        kind: 'image' as const,
        url: `/generated-cards/card-${n}.png`,
        fit: 'framed' as const,
        trim: 3.5,
      }))
    return shuffle([...wordFaces, ...imageFaces])
  },
}
