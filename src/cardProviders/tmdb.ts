import type { Face } from '../Face'
import type { CardProvider } from './providers'
import { shuffle } from './words'

export const tmdb: CardProvider = { id: 'tmdb', label: 'Movies', group: 'culture', difficulty: 'tough', icon: '🎬', description: 'Stills from popular and acclaimed films', source: 'TMDB', sourceUrl: 'https://www.themoviedb.org', fetch }

interface TmdbMovie {
  backdrop_path: string | null
  title: string
  id: number
}

async function fetch(): Promise<Face[]> {
  const key = import.meta.env.VITE_TMDB_API_KEY
  if (!key) throw new Error('Missing VITE_TMDB_API_KEY')

  const page = Math.floor(Math.random() * 5) + 1
  const bodies = await Promise.all(
    ['popular', 'top_rated'].map((list) =>
      window
        .fetch(`https://api.themoviedb.org/3/movie/${list}?api_key=${key}&page=${page}`)
        .then((response) => {
          if (!response.ok) throw new Error(`TMDB request failed: ${response.status}`)
          return response.json() as Promise<{ results: TmdbMovie[] }>
        }),
    ),
  )

  const faces = shuffle(bodies.flatMap((body) => body.results))
    .filter((movie) => movie.backdrop_path)
    .map((movie): Face => ({
      kind: 'image',
      url: `https://image.tmdb.org/t/p/w780${movie.backdrop_path}`,
      tooltip: movie.title,
      link: `https://www.themoviedb.org/movie/${movie.id}`,
    }))

  if (faces.length < 20) throw new Error('TMDB returned too few backdrops')
  return faces.slice(0, 20)
}
