import type { CardProvider } from './providers'

interface TmdbMovie {
  backdrop_path: string | null
}

const shuffle = <T>(items: T[]): T[] => {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// Fetches 20 movie backdrops from TMDB — wide film stills that make recognizable
// card faces. Mixes the popular and top-rated lists so a board spans current hits
// and acclaimed classics; a random page varies boards between games. Throws if no
// key is configured or a request fails, so the caller can fall back to another
// provider.
async function fetch(): Promise<string[]> {
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
    .map((movie) => `https://image.tmdb.org/t/p/w780${movie.backdrop_path}`)

  if (faces.length < 20) throw new Error('TMDB returned too few backdrops')
  return faces.slice(0, 20)
}

export const tmdb: CardProvider = { id: 'tmdb', label: 'Movies', kind: 'image', fetch }
