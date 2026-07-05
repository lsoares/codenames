import type { CardProvider } from './providers'
import { shuffle } from './words'

// Picbreeder has no API: the site (a static Vue app) ships its published pictures
// as webpack-bundled assets at /img/<id>.<hash>.png. The id runs 1–24 but the hash
// is content-derived and unguessable, so the URLs aren't constructable from the id
// alone — we pin the 24 known stems lifted from the app bundle. Each is a 320×320
// CPPN-evolved image: vivid, flowing, abstract card faces.
const IMAGES = [
  '1.d168a258', '2.ac23f71f', '3.9470886b', '4.0bee761b', '5.f9ea11e9', '6.323ffebd',
  '7.01ac0b22', '8.42e6f303', '9.35390049', '10.6b15de2b', '11.f3ab1a4a', '12.93b2f7fa',
  '13.6fa33271', '14.cf65bacc', '15.820c61d3', '16.a04ddbaa', '17.1cf0942f', '18.9a3e7711',
  '19.08288d88', '20.fd01f0ea', '21.7cba5b40', '22.75295e6f', '23.d32620f9', '24.7e26d61e',
]

async function fetch(): Promise<string[]> {
  return shuffle(IMAGES)
    .slice(0, 20)
    .map((stem) => `https://picbreeder.net/img/${stem}.png`)
}

export const picbreeder: CardProvider = {
  id: 'picbreeder',
  label: 'Picbreeder',
  icon: '🧬',
  description: 'CPPN images collaboratively evolved on Picbreeder',
  credit: { label: 'Picbreeder', url: 'https://picbreeder.net' },
  fetch,
}
