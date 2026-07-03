import type { CardProvider } from './types'

// Concrete, picturable categories. Datamuse's "triggered by" (rel_trg) returns
// words statistically associated with these, which yields Codenames-ish nouns
// (kitchen → stove, sink, oven, knife) far better than random dictionary words.
const SEEDS = [
  'animal', 'food', 'kitchen', 'sport', 'vehicle', 'tool', 'fruit', 'house',
  'ocean', 'space', 'music', 'plant', 'weather', 'building', 'insect', 'bird',
  'clothes', 'farm', 'forest', 'jungle', 'desert', 'mountain', 'castle', 'pirate',
  'monster', 'circus', 'garden', 'winter', 'beach', 'dinosaur', 'robot', 'treasure',
  'candy', 'toy', 'zoo', 'camping', 'bakery', 'city', 'fish', 'holiday',
]

// Quality floor: a curated, offline word bank used to top up (or fully replace)
// the API when it's down or its words are too sparse after filtering.
const FALLBACK = [
  'APPLE', 'BEACH', 'BRIDGE', 'CASTLE', 'CHAIR', 'CLOCK', 'CLOUD', 'DOG',
  'DOOR', 'DRAGON', 'ENGINE', 'FOREST', 'GARDEN', 'GHOST', 'GLASS', 'GUITAR',
  'HAMMER', 'HORSE', 'ISLAND', 'JACKET', 'KING', 'KNIGHT', 'LADDER', 'LEMON',
  'LION', 'MASK', 'MOON', 'MOUSE', 'OCEAN', 'PALACE', 'PENCIL', 'PIANO',
  'PIRATE', 'PLANET', 'RIVER', 'ROBOT', 'ROCKET', 'SCHOOL', 'SHIP', 'SNAKE',
  'SPIDER', 'STAR', 'STORM', 'SWORD', 'TABLE', 'TIGER', 'TOWER', 'TRAIN',
  'TREE', 'TRUCK', 'VIOLIN', 'WHALE', 'WINDOW', 'WIZARD', 'WOLF', 'ANCHOR',
  'BALLOON', 'BANANA', 'BOTTLE', 'CAMERA', 'CANDLE', 'COMPASS', 'DESERT',
  'FEATHER', 'HELMET', 'JUNGLE', 'LANTERN', 'MAGNET', 'NEEDLE', 'PARROT',
  'PYRAMID', 'RAINBOW', 'SHARK', 'SKELETON', 'TENT', 'THUNDER', 'TURTLE',
  'VOLCANO', 'WINDMILL', 'ZEBRA', 'BELL', 'BONE',
]

interface DatamuseWord {
  word: string
  tags?: string[]
}

const shuffle = <T>(items: T[]): T[] => {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// Keep common, single, picturable nouns; drop proper nouns, rare words, and
// plurals whose singular is already in the pool.
function usable(entry: DatamuseWord, seen: Set<string>): string | null {
  const tags = entry.tags ?? []
  const freq = Number(tags.find((t) => t.startsWith('f:'))?.slice(2) ?? 0)
  const word = entry.word.toUpperCase()
  if (!tags.includes('n') || tags.includes('prop')) return null
  if (!/^[A-Z]{3,8}$/.test(word)) return null
  if (freq < 3) return null
  if (seen.has(word)) return null
  if (word.endsWith('S') && seen.has(word.slice(0, -1))) return null
  return word
}

async function fetch(): Promise<string[]> {
  const seen = new Set<string>()
  try {
    const seeds = shuffle(SEEDS).slice(0, 6)
    const responses = await Promise.all(
      seeds.map((seed) =>
        window
          .fetch(`https://api.datamuse.com/words?rel_trg=${seed}&md=fp&max=40`)
          .then((r) => (r.ok ? (r.json() as Promise<DatamuseWord[]>) : []))
          .catch(() => [] as DatamuseWord[]),
      ),
    )
    for (const entry of shuffle(responses.flat())) {
      const word = usable(entry, seen)
      if (word) seen.add(word)
      if (seen.size >= 20) break
    }
  } catch {
    // fall through to the fallback top-up below
  }

  const words = [...seen]
  for (const word of shuffle(FALLBACK)) {
    if (words.length >= 20) break
    if (!seen.has(word)) words.push(word)
  }
  return words.slice(0, 20)
}

export const words: CardProvider = { id: 'words', label: 'Words', kind: 'word', fetch }
