import { icon, type Face } from '../Face'
import type { CardProvider } from './providers'
import { shuffle } from './words'

const ICONS = [
  'house', 'car', 'cat', 'dog', 'fish', 'tree', 'star', 'heart', 'key', 'bell',
  'camera', 'clock', 'bug', 'crown', 'ghost', 'rocket', 'anchor', 'bolt', 'cloud', 'fire',
  'gift', 'globe', 'guitar', 'hammer', 'leaf', 'lock', 'moon', 'paw', 'plane', 'robot',
  'scissors', 'shield', 'snowflake', 'sun', 'trophy', 'umbrella', 'wrench', 'bicycle', 'bomb', 'book',
  'brain', 'carrot', 'crow', 'dragon', 'feather', 'flag', 'heart-pulse', 'lightbulb', 'mug-hot', 'plug',
]

async function fetch(): Promise<Face[]> {
  return shuffle(ICONS)
    .slice(0, 20)
    .map((name) =>
      icon(`https://cdn.jsdelivr.net/gh/FortAwesome/Font-Awesome@6.5.2/svgs/solid/${name}.svg`, {
        tooltip: name.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()),
        link: `https://fontawesome.com/icons/${name}`,
      }),
    )
}

export const icons: CardProvider = { id: 'icons', label: 'Pictograms', icon: '✳️', description: 'Simple Font Awesome pictograms', credit: { label: 'Font Awesome', url: 'https://fontawesome.com' }, fetch }
