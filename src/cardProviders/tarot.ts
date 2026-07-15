import type { Face } from '../Face'
import type { CardProvider } from './providers'
import { shuffle } from './words'

export const tarot: CardProvider = {
  id: 'tarot',
  label: 'Tarot', group: 'culture', difficulty: 'brutal',
  icon: '🔮',
  description: 'The 78-card Rider–Waite tarot deck',
  source: 'tarotcardapi', sourceUrl: 'https://github.com/krates98/tarotcardapi',
  portrait: true,
  fetch,
}

const CDN = 'https://cdn.jsdelivr.net/gh/krates98/tarotcardapi@main/images'

// The 22 Major Arcana have irregular file names (note the odd-one-out
// TheLovers.jpg); the 56 Minor Arcana follow a strict rank-of-suit pattern and
// are generated below. Each tuple is [image file name, display name].
const MAJOR: [string, string][] = [
  ['thefool.jpeg', 'The Fool'], ['themagician.jpeg', 'The Magician'], ['thehighpriestess.jpeg', 'The High Priestess'],
  ['theempress.jpeg', 'The Empress'], ['theemperor.jpeg', 'The Emperor'], ['thehierophant.jpeg', 'The Hierophant'],
  ['TheLovers.jpg', 'The Lovers'], ['thechariot.jpeg', 'The Chariot'], ['thestrength.jpeg', 'Strength'],
  ['thehermit.jpeg', 'The Hermit'], ['wheeloffortune.jpeg', 'Wheel of Fortune'], ['justice.jpeg', 'Justice'],
  ['thehangedman.jpeg', 'The Hanged Man'], ['death.jpeg', 'Death'], ['temperance.jpeg', 'Temperance'],
  ['thedevil.jpeg', 'The Devil'], ['thetower.jpeg', 'The Tower'], ['thestar.jpeg', 'The Star'],
  ['themoon.jpeg', 'The Moon'], ['thesun.jpeg', 'The Sun'], ['judgement.jpeg', 'Judgement'],
  ['theworld.jpeg', 'The World'],
]

const RANKS = ['ace', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'page', 'knight', 'queen', 'king']
const SUITS = ['cups', 'pentacles', 'swords', 'wands']

const CARDS: [string, string][] = [
  ...MAJOR,
  ...SUITS.flatMap((suit) =>
    RANKS.map((rank): [string, string] => [`${rank}of${suit}.jpeg`, `${cap(rank)} of ${cap(suit)}`]),
  ),
]

async function fetch(): Promise<Face[]> {
  return shuffle(CARDS)
    .slice(0, 20)
    .map(([file, name]) => ({
      kind: 'image',
      url: `${CDN}/${file}`,
      fit: 'contain',
      tooltip: name,
    }))
}

function cap(word: string): string {
  return word[0].toUpperCase() + word.slice(1)
}
