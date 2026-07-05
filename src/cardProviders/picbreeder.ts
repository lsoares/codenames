import type { CardProvider } from './providers'

// Picbreeder has no API: its CPPN-evolved images are published as pre-rendered
// thumbnails at thumbnails/<id>.jpg, where every 4-digit id (1000–9999) is a
// real image. So we just hotlink 20 random ones — no key, no request, no
// failure. Boards vary between games.
async function fetch(): Promise<string[]> {
  const ids = new Set<number>()
  while (ids.size < 20) ids.add(Math.floor(Math.random() * 9000) + 1000)
  return [...ids].map((id) => `https://picbreeder.net/thumbnails/${id}.jpg`)
}

export const picbreeder: CardProvider = {
  id: 'picbreeder',
  label: 'Picbreeder',
  icon: '🧬',
  description: 'CPPN-evolved images bred by the Picbreeder community',
  credit: { label: 'Picbreeder', url: 'https://picbreeder.net' },
  fetch,
}
