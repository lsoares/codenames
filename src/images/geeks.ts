import type { CardProvider } from './providers'
import { datamuseWords, shuffle } from './words'

// Tech-flavoured category seeds: Datamuse's "triggered by" turns these into geeky
// nouns (software → BROWSER, SERVER, DESKTOP; hacker → PASSWORD, EXPLOIT), so the
// word-bank half of the board reads geeky instead of generic.
const GEEK_SEEDS = [
  'computer', 'software', 'hardware', 'internet', 'programming', 'network',
  'hacker', 'keyboard', 'gaming', 'science', 'database', 'security',
]

// StackOverflow's most-popular tags are the everyday vocabulary of programming.
// Keep the ones that read as plain board words (letters only, 3–8), so a tag
// like DOCKER or KERNEL lands but `node.js` or `c++` never becomes a card. On a
// network hiccup this yields nothing rather than throwing, so the mix degrades
// to just the word bank.
async function stackOverflowTags(): Promise<string[]> {
  const data = await window
    .fetch('https://api.stackexchange.com/2.3/tags?order=desc&sort=popular&site=stackoverflow&pagesize=100')
    .then((r) => (r.ok ? (r.json() as Promise<{ items?: { name: string }[] }>) : { items: [] }))
    .catch(() => ({ items: [] as { name: string }[] }))
  return [
    ...new Set(
      (data.items ?? [])
        .map((tag) => tag.name.toUpperCase())
        .filter((name) => /^[A-Z]{3,8}$/.test(name)),
    ),
  ]
}

// A geek board blends programming tags with the general word bank. Alternate
// between the two sources so it's a genuine mix rather than whichever list came
// back longer, and stop at a full board of 20 (or fewer if both run dry).
async function fetch(): Promise<string[]> {
  const [tagList, dictionary] = await Promise.all([stackOverflowTags(), datamuseWords(20, GEEK_SEEDS)])
  const tags = shuffle(tagList)
  const board = new Set<string>()
  while (board.size < 20 && (tags.length || dictionary.length)) {
    for (const pool of [tags, dictionary]) {
      if (board.size >= 20) break
      const word = pool.shift()
      if (word) board.add(word)
    }
  }
  return [...board]
}

export const geeks: CardProvider = { id: 'geeks', label: 'Words 🤓', icon: '💻', kind: 'word', fetch }
