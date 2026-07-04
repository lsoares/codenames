import type { CardProvider } from './providers'
import { shuffle } from './words'

const IMAGES = Object.values(
  import.meta.glob('../assets/official/*.{jpg,jpeg,png,webp,gif}', {
    eager: true,
    query: '?url',
    import: 'default',
  }),
) as string[]

async function fetch(): Promise<string[]> {
  if (IMAGES.length < 20) throw new Error('Fewer than 20 official pictures available')
  return shuffle(IMAGES).slice(0, 20)
}

export const official: CardProvider = {
  id: 'official',
  label: 'Official',
  icon: '🕵️',
  description: 'The official Codenames Pictures cards',
  credit: { label: 'Codenames Pictures', url: 'https://czechgames.com/en/codenames-pictures/' },
  fetch,
}
