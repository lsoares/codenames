import type { Face } from '../Face'
import type { Deck } from './deck'
import { shuffle } from '../shuffle'

export const games: Deck = {
  id: 'games',
  label: 'Games',
  group: 'culture',
  difficulty: 'brutal',
  icon: '🎮',
  description: 'Artwork from acclaimed video games',
  source: 'RAWG',
  sourceUrl: 'https://rawg.io',
  fetch,
}

interface RawgGame {
  background_image: string | null
  name: string
  slug: string
}

async function fetch(): Promise<Face[]> {
  const key = import.meta.env.VITE_RAWG_API_KEY
  if (!key) throw new Error('Missing VITE_RAWG_API_KEY')

  const page = Math.floor(Math.random() * 10) + 1
  const response = await window.fetch(
    `https://api.rawg.io/api/games?key=${key}&ordering=-metacritic&page_size=40&page=${page}`,
  )
  if (!response.ok) throw new Error(`RAWG request failed: ${response.status}`)
  const body = (await response.json()) as { results: RawgGame[] }

  const faces = shuffle(body.results).flatMap((game) =>
    game.background_image ? [{ url: game.background_image, name: game.name, slug: game.slug }] : [],
  )

  if (faces.length < 20) throw new Error('RAWG returned too few images')
  return faces.slice(0, 20).map(({ url, name, slug }) => ({
    kind: 'image',
    url,
    tooltip: name,
    link: `https://rawg.io/games/${slug}`,
  }))
}
