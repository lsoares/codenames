// A shared toolkit for the procedural shape card sources: a seeded PRNG, SVG
// primitive builders on a normalized 0..100 viewBox, a palette helper, and the
// data-URL encoder. Style modules use these so they hold only composition rules.

export interface Rng {
  range(min: number, max: number): number
  int(min: number, max: number): number
  pick<T>(items: T[]): T
  chance(p: number): boolean
}

// mulberry32: a tiny, fast, well-distributed seeded PRNG. Seeding keeps draw
// code reproducible for debugging without a global RNG.
export function rng(seed: number): Rng {
  let state = seed >>> 0
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    pick: (items) => items[Math.floor(next() * items.length)],
    chance: (p) => next() < p,
  }
}

const round = (n: number) => Math.round(n * 100) / 100

export const circle = (cx: number, cy: number, r: number, attrs = ''): string =>
  `<circle cx="${round(cx)}" cy="${round(cy)}" r="${round(r)}" ${attrs}/>`

export const ellipse = (cx: number, cy: number, rx: number, ry: number, attrs = ''): string =>
  `<ellipse cx="${round(cx)}" cy="${round(cy)}" rx="${round(rx)}" ry="${round(ry)}" ${attrs}/>`

export const rect = (x: number, y: number, w: number, h: number, attrs = ''): string =>
  `<rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" ${attrs}/>`

export const line = (x1: number, y1: number, x2: number, y2: number, attrs = ''): string =>
  `<line x1="${round(x1)}" y1="${round(y1)}" x2="${round(x2)}" y2="${round(y2)}" ${attrs}/>`

export const polygon = (points: [number, number][], attrs = ''): string =>
  `<polygon points="${points.map(([x, y]) => `${round(x)},${round(y)}`).join(' ')}" ${attrs}/>`

export const path = (d: string, attrs = ''): string => `<path d="${d}" ${attrs}/>`

export const group = (children: string, transform: string): string =>
  `<g transform="${transform}">${children}</g>`

// A small harmonious set: one base hue plus 1–2 nearby hues, all saturated and
// mid-dark so ink reads on the light background.
export function palette(r: Rng): { bg: string; ink: string[] } {
  const base = r.int(0, 359)
  const count = r.int(2, 3)
  const ink = Array.from({ length: count }, (_, i) =>
    `hsl(${(base + i * r.int(20, 60)) % 360} ${r.int(55, 80)}% ${r.int(35, 55)}%)`,
  )
  return { bg: `hsl(${base} ${r.int(15, 30)}% ${r.int(92, 97)}%)`, ink }
}

// Wrap element strings in a 0..100 viewBox root and percent-encode to a data
// URL. UTF-8 percent-encoding is smaller than base64 and keeps output diffable.
export function svg(children: string, bg: string): string {
  const doc =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<rect width="100" height="100" fill="${bg}"/>${children}</svg>`
  return `data:image/svg+xml,${encodeURIComponent(doc)}`
}
