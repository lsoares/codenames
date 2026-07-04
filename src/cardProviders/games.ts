import type { CardProvider } from './providers'
import { shuffle } from './words'

interface RawgGame {
  background_image: string | null
}

// Fetches 20 game artworks from RAWG. Orders by Metacritic so the board reads as
// acclaimed classics and landmark titles rather than random releases; a random
// page over the top few hundred keeps boards varied between games. Throws if no
// key is configured or a request fails, so the caller can fall back to another
// provider.
async function fetch(): Promise<string[]> {
  const key = import.meta.env.VITE_RAWG_API_KEY
  if (!key) throw new Error('Missing VITE_RAWG_API_KEY')

  const page = Math.floor(Math.random() * 10) + 1
  const response = await window.fetch(
    `https://api.rawg.io/api/games?key=${key}&ordering=-metacritic&page_size=40&page=${page}`,
  )
  if (!response.ok) throw new Error(`RAWG request failed: ${response.status}`)
  const body = (await response.json()) as { results: RawgGame[] }

  const faces = shuffle(body.results)
    .flatMap((game) => (game.background_image ? [game.background_image] : []))

  if (faces.length < 20) throw new Error('RAWG returned too few images')
  return faces.slice(0, 20)
}

export const games: CardProvider = { id: 'games', label: 'Games', icon: '🎮', kind: 'image', extra: true, fetch }
