# ThinkingBar — a fixed-footprint minute bar

## Problem

The thinking clock (`src/ui/ThinkingBeads.tsx`) is a calm count-up that adds one
9px dot per elapsed minute. Inside the spymaster's `ClueBar` it is the **first**
element of the flex row, so every new minute (dot + gap) shoves the focus toggle,
word input, count spinner, and submit button rightward. The same component is
reused in the operatives' status pill, where it likewise widens the inline clue
token.

## Goal

Stop the horizontal push by reshaping the clock into a **fixed-footprint bar** that
lives on its **own row under** the clue form / status pill. Preserve today's calm,
per-minute, fade-in feel — it is not reframed as a countdown or deadline.

## Design

### Component: `ThinkingBar` (renamed from `ThinkingBeads`)

Rename the component and its files `ThinkingBeads.tsx` / `ThinkingBeads.module.css`
→ `ThinkingBar.tsx` / `ThinkingBar.module.css` ("beads" is no longer honest).

**Timer logic is unchanged:**
- same count-up `seconds` state and 1s `setTimeout` tick
- same 10-minute (`CAP_SECONDS = 600`) cap
- same per-minute soft beep (`playSound('minute', 0.5)`)
- same `title="Thinking for m:ss"` tooltip
- still purely client-local; no `Game.ts` or multiplayer changes

**Rendering changes** from a growing dot list to a fixed 10-cell track:
- Always render **10 equal cells** in a flex row that stretches to the full width
  of its container (`flex: 1` per cell, small gap, ~5–6px tall, rounded ends).
- Cell states, driven by `completed = min(floor(seconds/60), 10)`:
  - **completed** (`index < completed`) → solid team colour
  - **current** (`index === completed`, only when not capped) → the fading cell:
    inline `opacity` stepped `0.35 + 0.65 * fraction` each second with the existing
    `transition: opacity 1s linear`, **keyed on the minute** so each fresh minute
    mounts faint and fades in (same trick as today's fading dot)
  - **future** (`index > completed`) → faint team-tinted track
  - **capped** → all cells grey (`#9aa0a6`), no fading cell (reads as abandoned)
- Team tint keyed off `data-team` as today (`--bead-color` → red/blue, grey when
  `data-capped`). Rename the CSS var if convenient (e.g. `--cell-color`), but that
  is cosmetic.

### Placement 1 — spymaster clue bar (`ClueBar.tsx`)

`ClueBar` returns a **column** wrapper containing:
1. the existing `<form>` input row (focus toggle, word, count, submit) — the
   `ThinkingBeads` that was the form's first child is **removed** from the row
2. `<ThinkingBar>` spanning the form's width **underneath**

Because the bar is a sibling below the form (not a wrapping flex child), the mobile
`@media (max-width: 640px)` `flex-wrap: nowrap` rule on `.clueForm` is untouched,
and nothing in the input row shifts right anymore. The wrapper is a
`flex-direction: column` element with `align-items: stretch` so the bar matches the
form's width, sitting inside `.menu` in `GameScreen` as before.

### Placement 2 — operatives status pill (`GameScreen.tsx`)

Move `<ThinkingBar>` **out of** the `.clueInline` token and render it as a direct,
**full-width child** of `.statusPill` (which already `flex-wrap`s), placed after the
`.clueInline` span. A `width: 100%` (or `flex-basis: 100%`) class makes it drop onto
its own row beneath the "clue word + pips" token — the same bar, in the same spot
relative to content, in both usages. The guard on when it renders
(`acting === 'operatives' && mineTurn && props.mySeat === null`) is unchanged.

## Out of scope / unchanged

- Timer, beep, and cap behaviour
- When the timer is shown (the `GameScreen` conditions)
- `Game.ts`, multiplayer, sound
- The clue pips, pass button, and status text

## Testing

- Existing UI tests that reference the clock/beads by role or title should keep
  passing via the unchanged `title="Thinking for m:ss"`; update any test that
  selects it by the old component/class name to the bar.
- Verify by eye at both usages: the input row and clue token no longer widen or
  shift as minutes pass; a fresh current cell fades in each minute; at 10 minutes
  the whole bar greys.
