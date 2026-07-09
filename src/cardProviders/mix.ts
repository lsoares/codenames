import type { Face } from '../Face'
import { providers, type CardProvider } from './providers'
import { shuffle } from './words'

export const mix: CardProvider = {
  id: 'mix',
  label: 'Mix',
  icon: '🎲',
  description: 'A blend of every other deck',
  hidden: true,
  fetch,
}

const keyOf = (face: Face): string =>
  face.kind === 'text' || face.kind === 'glyph' ? face.text : face.url

async function fetch(): Promise<Face[]> {
  const seen = new Set<string>()
  const decks = providers
    .filter((deck) => deck.id !== 'mix' && deck.id !== 'geeks' && deck.id !== 'official-words')
    .filter((deck) => {
      const source = deck.credit?.label ?? deck.id
      const fresh = !seen.has(source)
      seen.add(source)
      return fresh
    })
  const draws = await Promise.allSettled(decks.map((deck) => deck.fetch()))
  const pools = draws.flatMap((draw) => (draw.status === 'fulfilled' ? [draw.value] : []))

  const faces = new Map<string, Face>()
  for (let depth = 0; faces.size < 20 && pools.some((pool) => depth < pool.length); depth++) {
    for (const pool of pools) if (depth < pool.length && faces.size < 20) faces.set(keyOf(pool[depth]), pool[depth])
  }

  if (faces.size < 20) throw new Error('Mix returned too few faces')
  return shuffle([...faces.values()])
}
