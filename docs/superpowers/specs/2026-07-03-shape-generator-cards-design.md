# Shape-Generator Card Sources — Design

**Date:** 2026-07-03
**Status:** Approved for planning

## Summary

Add a new family of card sources to Codenames that generate card faces
procedurally from SVG primitives. Random compositions lean on *pareidolia* —
the brain projecting meaning onto ambiguous shapes — so players "see" things
that make for surprising clues. Ships as **four** distinct generative styles,
each a separate entry in the card-source menu, so we can A/B them in real play
and keep the ones that land.

## Goals

- Four generative styles, individually selectable, judged in isolation.
- Zero changes to the board renderer, game model, or networking layer.
- Always available: no API key, no network, never fails.
- Boards sync identically to all players in a multiplayer game.

## Non-goals

- Seed-sharing / per-client regeneration (see Integration rationale).
- Guaranteeing recognizable objects — ambiguity is the point.
- Difficulty tuning or curation of "good" boards. Out of scope for v1.

## Integration

Each generated card face is an **SVG encoded as a `data:image/svg+xml,` URL
string**. This slots into the existing `image` board mode with no renderer
changes: `Board.tsx` already renders `image`-mode faces as
`<img src={card.face}>`, and faces already travel over PeerJS as plain strings,
so generated boards sync to every player for free.

Unchanged: `CardProvider` interface (`src/images/types.ts`), `Board`
(`src/ui/Board.tsx`), `createGame` (`src/game/createGame.ts`), and the net
layer. Each style exposes the standard `fetch(): Promise<string[]>` returning
20 SVG data URLs. Generation is synchronous and never throws, so the
fetch-failure fallback to the word board is never exercised — this becomes the
first fully-offline, always-available image source.

**Deliberate choice — ship full SVGs, not seeds.** Each SVG is ~1–2 KB
(~30 KB per 20-card board over PeerJS — negligible). Sharing per-card seeds and
regenerating on each client would be leaner but would force the Board to know
how to render a seed, adding an interface and a divergence risk for no real
benefit at this payload size.

## Shared toolkit (`src/images/shapes/toolkit.ts`)

Every style draws from a shared toolkit so style modules encode only
*composition rules*, not SVG plumbing.

- **`rng(seed)`** — seeded PRNG (mulberry32). Each card gets its own seed, so
  output is reproducible and non-determinism stays out of draw code. Helpers:
  `range(min, max)`, `int(min, max)`, `pick(array)`, `chance(p)`.
- **Primitive builders** returning SVG element strings: `circle`, `ellipse`,
  `rect`, `line`, `polygon`, `path` (arcs/curves), and `group` (transform:
  translate / rotate / scale). All operate in a normalized **viewBox
  `0 0 100 100`**.
- **`palette(rng)`** — a small harmonious hue set (2–3 hues, HSL with controlled
  spread) so a card doesn't become confetti. Backgrounds stay light/neutral so
  the team-color reveal border and the ☠️ assassin overlay stay legible.
- **`svg(children)`** — wraps element strings in the root `<svg viewBox>` and
  UTF-8 percent-encodes to a `data:image/svg+xml,` URL (not base64 — smaller
  and diffable).

A style module reduces to: for each of 20 cards → seed an `rng` → compose
primitives → `svg()`.

## The four styles

Each is its own module exporting a `CardProvider`, registered in
`src/images/providers.ts` as a menu entry. All share the toolkit and normalized
viewBox; each is ~30–60 lines of composition rules with tuning knobs (counts,
jitter) as inline literals at the top of the file.

- **`abstract.ts` — "Abstract"** — 3–6 primitives scattered and overlapped with
  random rotation and translucency. No subject bias; pure projection.
- **`faces.ts` — "Faces"** — a loose face grammar: head region, two roughly
  mirrored "eye" marks in the upper half, optional nose line and mouth arc,
  jittered so it's never a clean smiley. Leans on face-detection so players
  almost always "see a guy."
- **`creatures.ts` — "Creatures"** — a body-plan grammar: blob/polygon body,
  2–6 radiating limbs, 1–3 eyes, optional tail/antennae. Reads as little
  critters or alien glyphs.
- **`art.ts` — "Art"** — emergent pattern: pick a symmetry (mirror / radial
  n-fold) and tile a few primitives through it. Kaleidoscopic and
  designed-feeling; less "thing"-like.

## Testing

The project has one test runner: Playwright e2e. We keep it single-runner and
test the styles **vertically through the board**, matching the role-based style
of `test/provider.spec.ts` and the user's testing philosophy (test real
interfaces, no mocks):

- For each of the four styles, select it via the New game ▾ source menu and
  assert the board renders 20 card `<img>` faces whose `src` is a
  `data:image/svg+xml` URL — reusing `test/gamePage.ts` and role-based locators.

A broken generator (invalid SVG, wrong count, non-URL output) surfaces as a
failing board render, so this single vertical test guards correctness without a
second test runner. The seeded PRNG is kept for clean, reproducible draw code,
not for a dedicated unit test.

## File plan

```
src/images/shapes/toolkit.ts     # PRNG, primitives, palette, svg() encoder
src/images/shapes/abstract.ts    # CardProvider "Abstract"
src/images/shapes/faces.ts       # CardProvider "Faces"
src/images/shapes/creatures.ts   # CardProvider "Creatures"
src/images/shapes/art.ts         # CardProvider "Art"
src/images/providers.ts          # register the four new providers
test/shapes.spec.ts              # provider + determinism + board smoke
```
