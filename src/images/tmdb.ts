import type { CardProvider } from './types'

interface TmdbMovie {
  backdrop_path: string | null
}

// Fetches 20 movie backdrops from TMDB — wide film stills that make recognizable
// card faces. A random early page keeps titles well-known while varying between
// games; two adjacent pages guarantee 20 usable stills even after dropping the
// odd movie with no backdrop. Throws if no key is configured or a request fails,
// so the caller can fall back to another provider.
async function fetch(): Promise<string[]> {
  const key = import.meta.env.VITE_TMDB_API_KEY
  if (!key) throw new Error('Missing VITE_TMDB_API_KEY')

  const page = Math.floor(Math.random() * 5) + 1
  const bodies = await Promise.all(
    [page, page + 1].map((p) =>
      window
        .fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${key}&page=${p}`)
        .then((response) => {
          if (!response.ok) throw new Error(`TMDB request failed: ${response.status}`)
          return response.json() as Promise<{ results: TmdbMovie[] }>
        }),
    ),
  )

  const faces = bodies
    .flatMap((body) => body.results)
    .filter((movie) => movie.backdrop_path)
    .map((movie) => `https://image.tmdb.org/t/p/w780${movie.backdrop_path}`)

  if (faces.length < 20) throw new Error('TMDB returned too few backdrops')
  return faces.slice(0, 20)
}

export const tmdb: CardProvider = { id: 'tmdb', label: 'Movies', kind: 'image', fetch }
