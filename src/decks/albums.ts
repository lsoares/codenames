import type { Face } from '../Face'
import type { Deck } from './deck'
import { shuffle } from '../shuffle'

export const albums: Deck = {
  id: 'albums',
  label: 'Album Art',
  group: 'culture',
  difficulty: 'brutal',
  icon: '💿',
  description: 'Cover art from electronic, jazz and experimental records',
  source: 'iTunes',
  sourceUrl: 'https://www.apple.com/itunes',
  fetch,
}

interface ItunesAlbum {
  collectionId: number
  collectionName: string
  artistName: string
  artworkUrl100: string | null
  collectionViewUrl: string
}

async function fetch(total = 20): Promise<Face[]> {
  const genres = shuffle([
    'ambient',
    'electronic',
    'techno',
    'experimental',
    'jazz',
    'shoegaze',
    'psychedelic',
    'idm',
    'krautrock',
    'dub',
  ]).slice(0, 3)

  const bodies = await Promise.all(
    genres.map((genre) =>
      window
        .fetch(`https://itunes.apple.com/search?term=${genre}&entity=album&limit=100`)
        .then((response) => {
          if (!response.ok) throw new Error(`iTunes request failed: ${response.status}`)
          return response.json() as Promise<{ results: ItunesAlbum[] }>
        }),
    ),
  )

  const seen = new Set<number>()
  const faces = shuffle(bodies.flatMap((body) => body.results))
    .filter(
      (album) =>
        album.artworkUrl100 && !seen.has(album.collectionId) && seen.add(album.collectionId),
    )
    .map((album): Face => ({
      kind: 'image',
      url: album.artworkUrl100!.replace('100x100bb', '600x600bb'),
      tooltip: `${album.artistName} — ${album.collectionName}`,
      link: album.collectionViewUrl,
    }))

  if (faces.length < total) throw new Error('iTunes returned too few albums')
  return faces.slice(0, total)
}
