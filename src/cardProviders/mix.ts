import { providers, type CardProvider } from './providers'
import { shuffle } from './words'

// Blends the other decks onto one board — words, emojis, icons, photos, the lot
// (bar the geeks and official word banks), at most one deck per source. Draws
// from all of them at once; a source that fails (missing key, network error) is
// dropped; throws only when the survivors can't fill a board, so getFaces falls
// back. No single credit fits a blended board, so it carries none.
async function fetch(): Promise<string[]> {
  // Keep at most one deck per source, so a source behind several decks (Pexels
  // backs abstract and things too) doesn't get several times the board share.
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

  // Round-robin so every surviving deck is represented, rather than letting one
  // deck's shuffle crowd the board.
  const faces = new Set<string>()
  for (let depth = 0; faces.size < 20 && pools.some((pool) => depth < pool.length); depth++) {
    for (const pool of pools) if (depth < pool.length && faces.size < 20) faces.add(pool[depth])
  }

  if (faces.size < 20) throw new Error('Mix returned too few faces')
  return shuffle([...faces])
}

export const mix: CardProvider = {
  id: 'mix',
  label: 'Mix',
  icon: '🎲',
  description: 'A blend of every other deck',
  fetch,
}
