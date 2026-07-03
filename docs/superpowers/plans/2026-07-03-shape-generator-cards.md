# Shape-Generator Card Sources Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four procedural card sources that generate SVG card faces from primitives, leaning on pareidolia, each selectable as its own menu entry.

**Architecture:** Each style is a `CardProvider` whose `fetch()` synchronously builds 20 SVGs and returns them as `data:image/svg+xml,` URL strings. This drops into the existing `image` board mode with no renderer, game-model, or network changes — faces already sync over PeerJS as plain strings. A shared toolkit module supplies a seeded PRNG, SVG primitive builders, a palette helper, and the data-URL encoder so each style file holds only composition rules.

**Tech Stack:** TypeScript, React 18, Vite, Playwright (e2e). No new dependencies.

## Global Constraints

- Normalized SVG coordinate space: **viewBox `0 0 100 100`** for every style.
- Each provider `fetch()` returns exactly **20** strings, each a `data:image/svg+xml,` URL.
- Generation is synchronous and **never throws** (no key, no network).
- SVG backgrounds stay light/neutral so the team-color reveal border and ☠️ overlay stay legible.
- Encode SVG as UTF-8 percent-encoded `data:image/svg+xml,...` (not base64).
- Follow existing style: inline props access via `props.x`, no unnecessary constants (inline one-off literals), co-located files. Match the existing 2-space, semicolon-free TypeScript style in `src/images/`.
- Single test runner: Playwright e2e only. Do not add a unit-test runner.

---

### Task 1: Shared shape toolkit

**Files:**
- Create: `src/images/shapes/toolkit.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Rng = { range(min: number, max: number): number; int(min: number, max: number): number; pick<T>(items: T[]): T; chance(p: number): boolean }`
  - `rng(seed: number): Rng` — seeded (mulberry32).
  - `circle(cx: number, cy: number, r: number, attrs?: string): string`
  - `ellipse(cx: number, cy: number, rx: number, ry: number, attrs?: string): string`
  - `rect(x: number, y: number, w: number, h: number, attrs?: string): string`
  - `line(x1: number, y1: number, x2: number, y2: number, attrs?: string): string`
  - `polygon(points: [number, number][], attrs?: string): string`
  - `path(d: string, attrs?: string): string`
  - `group(children: string, transform: string): string`
  - `palette(r: Rng): { bg: string; ink: string[] }` — `ink` has 2–3 HSL colors.
  - `svg(children: string, bg: string): string` — returns a `data:image/svg+xml,` URL.

Note: this task has no standalone test (pure helpers with no runner); it is exercised end-to-end by every style test in Tasks 2–5. Keep it minimal and correct.

- [ ] **Step 1: Write the toolkit**

Create `src/images/shapes/toolkit.ts`:

```ts
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no type errors).

- [ ] **Step 3: Commit**

```bash
git add src/images/shapes/toolkit.ts
git commit -m "Add shared toolkit for procedural shape card sources"
```

---

### Task 2: "Abstract" style + provider registration + e2e harness

This task also wires up the shared test helper and registers the first provider, so the vertical test can run. Later style tasks reuse the helper.

**Files:**
- Create: `src/images/shapes/abstract.ts`
- Modify: `src/images/providers.ts` (import + add to array)
- Create: `test/shapes.spec.ts`
- Modify: `test/gamePage.ts` (add `expectShapeBoard` helper)

**Interfaces:**
- Consumes: `rng`, `circle`, `ellipse`, `rect`, `line`, `polygon`, `group`, `palette`, `svg` from `./toolkit`; `CardProvider` from `../types`.
- Produces: `export const abstract: CardProvider` with `id: 'abstract'`, `label: 'Abstract'`, `kind: 'image'`. New exported test helper `expectShapeBoard(game: GamePage, label: string): Promise<void>` in `test/gamePage.ts`.

- [ ] **Step 1: Write the failing test**

Create `test/shapes.spec.ts`:

```ts
import { test } from '@playwright/test'
import { GamePage, expectShapeBoard } from './gamePage'

test('the Abstract source fills the board with generated SVG cards', async ({ page }) => {
  const game = new GamePage(page)
  await game.open()
  await game.createRoom()
  await expectShapeBoard(game, 'Abstract')
})
```

Add the `expectShapeBoard` helper to `test/gamePage.ts` (after the `GamePage` class, before or after existing exports — place it as a standalone exported function at end of file):

```ts
// Select a procedural shape source and assert it filled the board with 20
// generated SVG data-URL cards. A broken generator (wrong count, invalid SVG,
// non-URL face) surfaces here as a failing board render.
export async function expectShapeBoard(game: GamePage, label: string): Promise<void> {
  await game.newGameWithSource(label)
  const imgs = game.page.getByRole('img')
  await expect(imgs).toHaveCount(20)
  const srcs = await imgs.evaluateAll((els) =>
    (els as HTMLImageElement[]).map((el) => el.getAttribute('src') ?? ''),
  )
  for (const src of srcs) {
    expect(src.startsWith('data:image/svg+xml,')).toBe(true)
    expect(decodeURIComponent(src.replace('data:image/svg+xml,', ''))).toContain('<svg')
  }
}
```

This requires `page` to be reachable and `expect` imported in `gamePage.ts`. Make these two edits to `test/gamePage.ts`:
1. Change the import line `import { type Page } from '@playwright/test'` to `import { type Page, expect } from '@playwright/test'`.
2. Change the `GamePage` constructor `private readonly page: Page` to `readonly page: Page` (drop `private`) so the helper can read `game.page`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test shapes --project=chromium`
Expected: FAIL — the "Abstract" source button does not exist yet (`newGameWithSource` can't find it), or the board still shows old faces.

- [ ] **Step 3: Write the Abstract style**

Create `src/images/shapes/abstract.ts`:

```ts
import type { CardProvider } from '../types'
import { rng, circle, ellipse, rect, polygon, group, palette, svg } from './toolkit'

// Abstract: 3–6 primitives scattered and overlapped with random rotation and
// translucency. No subject bias — the brain does the projecting.
function card(seed: number): string {
  const r = rng(seed)
  const { bg, ink } = palette(r)
  let body = ''
  const count = r.int(3, 6)
  for (let i = 0; i < count; i++) {
    const x = r.range(20, 80)
    const y = r.range(20, 80)
    const s = r.range(12, 34)
    const fill = `fill="${r.pick(ink)}" fill-opacity="${r.range(0.45, 0.85).toFixed(2)}"`
    const kind = r.int(0, 3)
    const shape =
      kind === 0
        ? circle(x, y, s / 2, fill)
        : kind === 1
          ? ellipse(x, y, s / 2, r.range(6, 18), fill)
          : kind === 2
            ? rect(x - s / 2, y - s / 2, s, s, fill)
            : polygon(
                Array.from({ length: r.int(3, 5) }, (_, k) => {
                  const a = (k / 4) * Math.PI * 2 + r.range(0, 1)
                  return [x + Math.cos(a) * s * 0.6, y + Math.sin(a) * s * 0.6] as [number, number]
                }),
                fill,
              )
    body += group(shape, `rotate(${r.int(0, 360)} ${x.toFixed(1)} ${y.toFixed(1)})`)
  }
  return svg(body, bg)
}

async function fetch(): Promise<string[]> {
  return Array.from({ length: 20 }, () => card(Math.floor(Math.random() * 2 ** 32)))
}

export const abstract: CardProvider = { id: 'abstract', label: 'Abstract', kind: 'image', fetch }
```

- [ ] **Step 4: Register the provider**

Modify `src/images/providers.ts`. Add the import and extend the array:

```ts
import { abstract } from './shapes/abstract'
```

Change:
```ts
export const providers: CardProvider[] = [unsplash, pexels, words]
```
to:
```ts
export const providers: CardProvider[] = [unsplash, pexels, words, abstract]
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx playwright test shapes --project=chromium`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/images/shapes/abstract.ts src/images/providers.ts test/shapes.spec.ts test/gamePage.ts
git commit -m "Add Abstract procedural card source with vertical e2e test"
```

---

### Task 3: "Faces" style

**Files:**
- Create: `src/images/shapes/faces.ts`
- Modify: `src/images/providers.ts`
- Modify: `test/shapes.spec.ts`

**Interfaces:**
- Consumes: toolkit exports; `CardProvider`.
- Produces: `export const faces: CardProvider` with `id: 'faces'`, `label: 'Faces'`, `kind: 'image'`.

- [ ] **Step 1: Write the failing test**

Append to `test/shapes.spec.ts`:

```ts
test('the Faces source fills the board with generated SVG cards', async ({ page }) => {
  const game = new GamePage(page)
  await game.open()
  await game.createRoom()
  await expectShapeBoard(game, 'Faces')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test shapes -g Faces --project=chromium`
Expected: FAIL — no "Faces" source button.

- [ ] **Step 3: Write the Faces style**

Create `src/images/shapes/faces.ts`:

```ts
import type { CardProvider } from '../types'
import { rng, circle, ellipse, line, path, palette, svg } from './toolkit'

// Faces: a loose face grammar — a head region, two roughly mirrored eye marks in
// the upper half, an optional nose line and mouth arc, all jittered so it is
// never a clean smiley. Leans on the brain's face detection.
function card(seed: number): string {
  const r = rng(seed)
  const { bg, ink } = palette(r)
  const stroke = `fill="none" stroke="${ink[0]}" stroke-width="${r.range(1.5, 3).toFixed(1)}"`
  let body = ''

  // Head: an ellipse or rounded blob, off-center a touch.
  const cx = r.range(45, 55)
  const cy = r.range(46, 56)
  body += ellipse(cx, cy, r.range(24, 32), r.range(28, 36), `fill="${ink[0]}" fill-opacity="0.12" ${`stroke="${ink[0]}" stroke-width="2"`}`)

  // Eyes: mirrored across the head axis, with independent jitter so they never
  // line up perfectly.
  const eyeY = cy - r.range(4, 12)
  const eyeDx = r.range(9, 16)
  const eyeR = r.range(2.5, 5)
  const eyeInk = r.pick(ink)
  body += circle(cx - eyeDx + r.range(-1.5, 1.5), eyeY + r.range(-1.5, 1.5), eyeR, `fill="${eyeInk}"`)
  body += circle(cx + eyeDx + r.range(-1.5, 1.5), eyeY + r.range(-1.5, 1.5), eyeR, `fill="${eyeInk}"`)

  // Optional nose: a short vertical line down the axis.
  if (r.chance(0.6)) body += line(cx, eyeY + 3, cx + r.range(-2, 2), cy + r.range(2, 8), stroke)

  // Mouth: an arc that can smile or frown depending on control-point sign.
  const my = cy + r.range(10, 18)
  const mw = r.range(8, 16)
  const curve = r.range(-8, 10)
  body += path(`M ${(cx - mw).toFixed(1)} ${my.toFixed(1)} Q ${cx.toFixed(1)} ${(my + curve).toFixed(1)} ${(cx + mw).toFixed(1)} ${my.toFixed(1)}`, stroke)

  return svg(body, bg)
}

async function fetch(): Promise<string[]> {
  return Array.from({ length: 20 }, () => card(Math.floor(Math.random() * 2 ** 32)))
}

export const faces: CardProvider = { id: 'faces', label: 'Faces', kind: 'image', fetch }
```

- [ ] **Step 4: Register the provider**

Modify `src/images/providers.ts`: add `import { faces } from './shapes/faces'` and append `faces` to the `providers` array (after `abstract`).

- [ ] **Step 5: Run test to verify it passes**

Run: `npx playwright test shapes -g Faces --project=chromium`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/images/shapes/faces.ts src/images/providers.ts test/shapes.spec.ts
git commit -m "Add Faces procedural card source"
```

---

### Task 4: "Creatures" style

**Files:**
- Create: `src/images/shapes/creatures.ts`
- Modify: `src/images/providers.ts`
- Modify: `test/shapes.spec.ts`

**Interfaces:**
- Consumes: toolkit exports; `CardProvider`.
- Produces: `export const creatures: CardProvider` with `id: 'creatures'`, `label: 'Creatures'`, `kind: 'image'`.

- [ ] **Step 1: Write the failing test**

Append to `test/shapes.spec.ts`:

```ts
test('the Creatures source fills the board with generated SVG cards', async ({ page }) => {
  const game = new GamePage(page)
  await game.open()
  await game.createRoom()
  await expectShapeBoard(game, 'Creatures')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test shapes -g Creatures --project=chromium`
Expected: FAIL — no "Creatures" source button.

- [ ] **Step 3: Write the Creatures style**

Create `src/images/shapes/creatures.ts`:

```ts
import type { CardProvider } from '../types'
import { rng, circle, ellipse, line, polygon, palette, svg } from './toolkit'

// Creatures: a body-plan grammar — a blob/polygon body, 2–6 radiating limbs,
// 1–3 eyes, and optional antennae. Reads as little critters or alien glyphs.
function card(seed: number): string {
  const r = rng(seed)
  const { bg, ink } = palette(r)
  const bodyColor = r.pick(ink)
  const cx = 50
  const cy = r.range(48, 58)
  const bodyR = r.range(16, 24)
  let body = ''

  // Limbs first, so the body overlaps their roots.
  const limbs = r.int(2, 6)
  const limbColor = r.pick(ink)
  for (let i = 0; i < limbs; i++) {
    const a = (i / limbs) * Math.PI * 2 + r.range(-0.3, 0.3)
    const len = r.range(bodyR + 6, bodyR + 20)
    const x2 = cx + Math.cos(a) * len
    const y2 = cy + Math.sin(a) * len
    body += line(cx + Math.cos(a) * bodyR * 0.6, cy + Math.sin(a) * bodyR * 0.6, x2, y2, `stroke="${limbColor}" stroke-width="${r.range(2, 4).toFixed(1)}" stroke-linecap="round"`)
    if (r.chance(0.5)) body += circle(x2, y2, r.range(2, 3.5), `fill="${limbColor}"`)
  }

  // Body: an ellipse or a rounded polygon blob. Pick the side count once so the
  // vertex ring closes consistently.
  const sides = r.int(5, 8)
  body += r.chance(0.5)
    ? ellipse(cx, cy, bodyR, bodyR * r.range(0.8, 1.2), `fill="${bodyColor}"`)
    : polygon(
        Array.from({ length: sides }, (_, k) => {
          const a = (k / sides) * Math.PI * 2
          const rad = bodyR * r.range(0.8, 1.15)
          return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad] as [number, number]
        }),
        `fill="${bodyColor}"`,
      )

  // Eyes on the upper body.
  const eyes = r.int(1, 3)
  const eyeInk = r.pick(ink) === bodyColor ? bg : r.pick(ink)
  for (let i = 0; i < eyes; i++) {
    const ex = cx + (eyes === 1 ? 0 : (i - (eyes - 1) / 2) * r.range(7, 11))
    const ey = cy - bodyR * r.range(0.2, 0.5)
    body += circle(ex, ey, r.range(2.5, 4.5), `fill="white"`)
    body += circle(ex + r.range(-1, 1), ey + r.range(-1, 1), r.range(1, 2), `fill="${eyeInk}"`)
  }

  // Optional antennae.
  if (r.chance(0.5)) {
    for (const s of [-1, 1]) {
      const ax = cx + s * r.range(4, 8)
      const ay = cy - bodyR
      const ty = ay - r.range(6, 14)
      body += line(ax, ay, ax + s * r.range(0, 5), ty, `stroke="${bodyColor}" stroke-width="1.5"`)
      body += circle(ax + s * r.range(0, 5), ty, 2, `fill="${bodyColor}"`)
    }
  }

  return svg(body, bg)
}

async function fetch(): Promise<string[]> {
  return Array.from({ length: 20 }, () => card(Math.floor(Math.random() * 2 ** 32)))
}

export const creatures: CardProvider = { id: 'creatures', label: 'Creatures', kind: 'image', fetch }
```

Note: in the polygon blob, call `r.int(5, 8)` once into a local `const sides` and reuse it for both the length and the modulus so the vertex ring closes consistently. Rewrite that block as:

```ts
  const sides = r.int(5, 8)
  body += r.chance(0.5)
    ? ellipse(cx, cy, bodyR, bodyR * r.range(0.8, 1.2), `fill="${bodyColor}"`)
    : polygon(
        Array.from({ length: sides }, (_, k) => {
          const a = (k / sides) * Math.PI * 2
          const rad = bodyR * r.range(0.8, 1.15)
          return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad] as [number, number]
        }),
        `fill="${bodyColor}"`,
      )
```

- [ ] **Step 4: Register the provider**

Modify `src/images/providers.ts`: add `import { creatures } from './shapes/creatures'` and append `creatures` to the `providers` array.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx playwright test shapes -g Creatures --project=chromium`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/images/shapes/creatures.ts src/images/providers.ts test/shapes.spec.ts
git commit -m "Add Creatures procedural card source"
```

---

### Task 5: "Art" style

**Files:**
- Create: `src/images/shapes/art.ts`
- Modify: `src/images/providers.ts`
- Modify: `test/shapes.spec.ts`

**Interfaces:**
- Consumes: toolkit exports; `CardProvider`.
- Produces: `export const art: CardProvider` with `id: 'art'`, `label: 'Art'`, `kind: 'image'`.

- [ ] **Step 1: Write the failing test**

Append to `test/shapes.spec.ts`:

```ts
test('the Art source fills the board with generated SVG cards', async ({ page }) => {
  const game = new GamePage(page)
  await game.open()
  await game.createRoom()
  await expectShapeBoard(game, 'Art')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test shapes -g Art --project=chromium`
Expected: FAIL — no "Art" source button.

- [ ] **Step 3: Write the Art style**

Create `src/images/shapes/art.ts`:

```ts
import type { CardProvider } from '../types'
import { rng, circle, rect, line, group, palette, svg } from './toolkit'

// Art: emergent pattern — build a few primitives in one quadrant, then tile them
// through a symmetry (mirror or radial n-fold). Kaleidoscopic and designed.
function motif(r: ReturnType<typeof rng>, ink: string[]): string {
  let out = ''
  const parts = r.int(2, 4)
  for (let i = 0; i < parts; i++) {
    const fill = `fill="${r.pick(ink)}" fill-opacity="${r.range(0.55, 0.9).toFixed(2)}"`
    const x = r.range(50, 80)
    const y = r.range(50, 80)
    const s = r.range(6, 20)
    const kind = r.int(0, 2)
    out +=
      kind === 0
        ? circle(x, y, s / 2, fill)
        : kind === 1
          ? rect(x, y, s, s, fill)
          : line(50, 50, x, y, `stroke="${r.pick(ink)}" stroke-width="${r.range(1.5, 4).toFixed(1)}"`)
  }
  return out
}

function card(seed: number): string {
  const r = rng(seed)
  const { bg, ink } = palette(r)
  const unit = motif(r, ink)

  // Radial n-fold: rotate the motif around center n times. Even n also mirrors.
  if (r.chance(0.6)) {
    const n = r.pick([4, 6, 8])
    let body = ''
    for (let i = 0; i < n; i++) body += group(unit, `rotate(${(360 / n) * i} 50 50)`)
    return svg(body, bg)
  }

  // Mirror kaleidoscope: reflect across both axes.
  const body =
    unit +
    group(unit, 'translate(100 0) scale(-1 1)') +
    group(unit, 'translate(0 100) scale(1 -1)') +
    group(unit, 'translate(100 100) scale(-1 -1)')
  return svg(body, bg)
}

async function fetch(): Promise<string[]> {
  return Array.from({ length: 20 }, () => card(Math.floor(Math.random() * 2 ** 32)))
}

export const art: CardProvider = { id: 'art', label: 'Art', kind: 'image', fetch }
```

- [ ] **Step 4: Register the provider**

Modify `src/images/providers.ts`: add `import { art } from './shapes/art'` and append `art` to the `providers` array. Final array:

```ts
export const providers: CardProvider[] = [unsplash, pexels, words, abstract, faces, creatures, art]
```

- [ ] **Step 5: Typecheck, then run the full shapes suite**

Run: `npx tsc --noEmit`
Expected: PASS (fix any unused imports flagged).

Run: `npx playwright test shapes --project=chromium`
Expected: PASS — all four style tests green.

- [ ] **Step 6: Commit**

```bash
git add src/images/shapes/art.ts src/images/providers.ts test/shapes.spec.ts
git commit -m "Add Art procedural card source"
```

---

### Task 6: Full-suite regression + manual look

**Files:** none (verification only).

- [ ] **Step 1: Run the whole e2e suite**

Run: `npm run test:e2e`
Expected: PASS — existing provider/board tests unaffected by the four new providers.

- [ ] **Step 2: Eyeball the output (manual, optional but recommended)**

Run: `npm run dev`, open the app, and for each new source (Abstract, Faces, Creatures, Art) start a new game and confirm the board fills with varied, non-blank shapes and the team-color reveal border stays readable when a spymaster seat is taken.

- [ ] **Step 3: Commit any tuning**

If you adjust counts/jitter while eyeballing, commit with a message like `Tune <style> composition`.

---

## Notes for the implementer

- Every style's `fetch()` seeds each card from `Math.floor(Math.random() * 2 ** 32)`. The seed only feeds the toolkit's `rng`; nothing shared depends on it, and the resulting SVG strings are what sync over PeerJS.
- Do not touch `Board.tsx`, `createGame.ts`, `types.ts`, or the net layer — the whole point is that SVG data URLs ride the existing `image` path.
- Keep each style file to composition rules only. If a file needs a helper that another style also needs, promote it to `toolkit.ts` rather than duplicating.
