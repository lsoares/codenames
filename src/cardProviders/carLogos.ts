import type { Face } from '../Face'
import type { CardProvider } from './providers'

export const carLogos: CardProvider = {
  id: 'car-logos',
  label: 'Car Logos', group: 'icons',
  icon: '🚗',
  description: 'Automobile brand logos from around the world',
  credit: { label: 'car-logos-dataset', url: 'https://github.com/filippofilip95/car-logos-dataset' },
  hidden: true,
  fetch,
}

// Mainstream marques get a heavier weight so they surface more often than the
// long tail of obscure brands, while every brand stays eligible.
const POPULAR = new Set([
  'abarth', 'acura', 'alfa-romeo', 'aston-martin', 'audi', 'bentley', 'bmw',
  'bugatti', 'buick', 'cadillac', 'chevrolet', 'chrysler', 'citroen', 'dacia',
  'dodge', 'ferrari', 'fiat', 'ford', 'honda', 'hyundai', 'jaguar', 'jeep',
  'kia', 'lamborghini', 'land-rover', 'lexus', 'lotus', 'maserati', 'mazda',
  'mclaren', 'mercedes-benz', 'mini', 'mitsubishi', 'nissan', 'opel', 'peugeot',
  'porsche', 'renault', 'rolls-royce', 'seat', 'skoda', 'subaru', 'suzuki',
  'tesla', 'toyota', 'volkswagen', 'volvo',
])

const CDN = 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos'

interface Brand {
  name: string
  slug: string
}

let brands: Promise<Brand[]> | null = null

async function fetch(): Promise<Face[]> {
  const all = await (brands ??= loadBrands())
  return sampleWeighted(all, 20).map((brand) => ({
    kind: 'image',
    url: `${CDN}/optimized/${brand.slug}.png`,
    fit: 'contain',
    tooltip: brand.name,
  }))
}

async function loadBrands(): Promise<Brand[]> {
  const response = await window.fetch(`${CDN}/data.json`)
  if (!response.ok) throw new Error(`Car logos request failed: ${response.status}`)
  return response.json() as Promise<Brand[]>
}

// Weighted sampling without replacement (Efraimidis–Spirakis): each brand gets a
// key of random^(1/weight), and the highest keys win. Heavier weights pull keys
// upward, so popular marques are favoured without ever excluding the rest.
function sampleWeighted(all: Brand[], count: number): Brand[] {
  if (all.length < count) throw new Error('Car logos returned too few brands')
  return all
    .map((brand) => ({ brand, key: Math.random() ** (1 / (POPULAR.has(brand.slug) ? 15 : 1)) }))
    .sort((a, b) => b.key - a.key)
    .slice(0, count)
    .map((entry) => entry.brand)
}
