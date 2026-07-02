// Offline placeholder cards: 20 distinct pastel numbered tiles as SVG data URIs.
// No network or API key — swapped for real Unsplash photos in a later slice.
export function placeholderImages(): string[] {
  return Array.from({ length: 20 }, (_, index) => {
    const hue = Math.floor((360 / 20) * index)
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='240'>
      <rect width='100%' height='100%' fill='hsl(${hue} 68% 80%)'/>
      <text x='50%' y='50%' font-family='sans-serif' font-size='110' font-weight='700'
            fill='hsl(${hue} 55% 34%)' text-anchor='middle' dominant-baseline='central'>${index + 1}</text>
    </svg>`
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  })
}
