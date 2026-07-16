import type { Face } from '../Face'
import type { Deck } from './deck'
import { shuffle } from '../shuffle'

export const memes: Deck = {
  title: 'Memes',
  category: 'culture',
  difficulty: 'tough',
  icon: '😂',
  description: 'Popular meme templates',
  source: 'Imgflip',
  sourceUrl: 'https://imgflip.com',
  fetch,
}

interface Meme {
  name: string
  url: string
}

async function fetch(total = 20): Promise<Face[]> {
  const response = await window.fetch('https://api.imgflip.com/get_memes')
  if (!response.ok) {
    throw new Error(`Imgflip request failed: ${response.status}`)
  }

  const { data } = (await response.json()) as { data: { memes: Meme[] } }
  if (data.memes.length < total) throw new Error('Imgflip returned too few memes')
  return shuffle(data.memes)
    .slice(0, total)
    .map((meme) => ({ kind: 'image', url: meme.url, tooltip: meme.name }))
}
