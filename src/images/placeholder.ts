import type { ImageProvider } from './types'

// Offline cards: 20 distinct pastel numbered tiles as SVG data URIs. No network
// or API key, so this doubles as the fallback when a live provider fails.
function fetch(): Promise<string[]> {
  return Promise.resolve(
    Array.from({ length: 20 }, (_, index) => {
      const hue = Math.floor((360 / 20) * index)
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='240'>
      <rect width='100%' height='100%' fill='hsl(${hue} 68% 80%)'/>
      <text x='50%' y='50%' font-family='sans-serif' font-size='110' font-weight='700'
            fill='hsl(${hue} 55% 34%)' text-anchor='middle' dominant-baseline='central'>${index + 1}</text>
    </svg>`
      return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
    }),
  )
}

export const offline: ImageProvider = { id: 'offline', label: 'Offline', fetch }
