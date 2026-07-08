import { text, type Face } from '../Face'
import type { CardProvider } from './providers'
import { datamuseWords, dictionaryLink, shuffle } from './words'

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
// back longer, and stop at a full board of 20 (or fewer if both run dry). Each
// word's ↗ points at the source it actually came from: a Stack Overflow tag page
// for the tags (DOCKER isn't in a dictionary), a Merriam-Webster entry for the
// word-bank nouns.
async function fetch(): Promise<Face[]> {
  const [tagList, dictionary] = await Promise.all([stackOverflowTags(), datamuseWords(20, GEEK_SEEDS)])
  const sources: [string[], (word: string) => string][] = [
    [shuffle(tagList), (word) => `https://stackoverflow.com/questions/tagged/${word.toLowerCase()}`],
    [dictionary, dictionaryLink],
  ]
  const board = new Map<string, string>()
  while (board.size < 20 && sources.some(([pool]) => pool.length)) {
    for (const [pool, linkFor] of sources) {
      if (board.size >= 20) break
      const word = pool.shift()
      if (word && !board.has(word)) board.set(word, linkFor(word))
    }
  }
  return [...board].map(([word, link]) => text(word, { link }))
}

export const geeks: CardProvider = { id: 'geeks', label: 'Words 🤓', icon: '💻', description: 'Programming and tech words', credit: { label: 'Stack Overflow', url: 'https://stackoverflow.com' }, fetch }
