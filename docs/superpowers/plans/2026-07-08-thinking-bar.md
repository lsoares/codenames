# ThinkingBar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reshape the thinking clock from a growing row of dots into a fixed-width 10-cell bar that lives on its own row under the clue form / status pill, so it never pushes the row's contents sideways.

**Architecture:** Rename `ThinkingBeads` → `ThinkingBar`, keeping the timer/beep/cap logic identical and only changing the render to a fixed ten-cell track that fills one cell per minute (current cell fades in). Reposition it in both call sites so it sits below the input row (`ClueBar` becomes a column; the operatives' status pill gets a full-width clock row).

**Tech Stack:** React 18 (function components, inline props), CSS Modules, Playwright for the existing UI suite. Build via `npm run build` (`tsc && vite build`); tests via `npm test`.

## Global Constraints

- Props typed inline, accessed via `props.x` — never destructured.
- Component styles live in a co-located `X.module.css`; only the theme is global.
- No explanatory comments that narrate intent; keep the existing doc-comment tone (a short header block above the component is in keeping with the current file).
- Timer behaviour must not change: count-up `seconds` state, 1s tick, 10-minute cap, per-minute `playSound('minute', 0.5)`, `title="Thinking for m:ss"`, purely client-local (no `Game.ts` / multiplayer changes).
- Team tint keyed off `data-team` (red/blue), grey when `data-capped`.

---

### Task 1: Create the `ThinkingBar` component and styles

Add the new component beside the old one (old one still imported elsewhere for now, so the build stays green). This task produces the fixed-footprint 10-cell bar with the same timer logic as `ThinkingBeads`.

**Files:**
- Create: `src/ui/ThinkingBar.tsx`
- Create: `src/ui/ThinkingBar.module.css`
- Reference (do not edit): `src/ui/ThinkingBeads.tsx`, `src/ui/ThinkingBeads.module.css`

**Interfaces:**
- Consumes: `Team` from `../Game`; `playSound` from `../sound`.
- Produces: `export default function ThinkingBar(props: { team: Team })` — a `<span>` root rendering exactly 10 `.cell` children; used by Tasks 2 and 3.

- [ ] **Step 1: Write the component**

Create `src/ui/ThinkingBar.tsx`:

```tsx
import { useEffect, useState } from 'react'
import type { Team } from '../Game'
import { playSound } from '../sound'
import styles from './ThinkingBar.module.css'

const CAP_MINUTES = 10 // stop at ten minutes — by then nobody's still at the board

// A calm, local count-up clock shown to whoever is currently thinking — the
// spymaster planning a clue, or the operatives weighing their guesses. A fixed
// ten-cell bar, one cell per minute; the current minute's cell fades in from faint
// to full, so progress is felt without a ticking number. A soft beep marks each
// whole minute. At ten minutes it stops and greys out. Purely client-local: nobody
// else sees or hears another player's clock.
export default function ThinkingBar(props: { team: Team }) {
  const [seconds, setSeconds] = useState(0)
  const capped = seconds >= CAP_MINUTES * 60
  useEffect(() => {
    if (capped) return
    const id = setTimeout(() => setSeconds((s) => s + 1), 1000)
    return () => clearTimeout(id)
  }, [seconds, capped])

  const completed = Math.min(Math.floor(seconds / 60), CAP_MINUTES)
  // A soft cue each time a whole minute lands, so a long think is felt, not watched.
  useEffect(() => {
    if (completed > 0) playSound('minute', 0.5) // quieter than the game's other cues
  }, [completed])

  const fraction = (seconds % 60) / 60
  const total = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

  return (
    <span
      className={styles.bar}
      data-team={props.team}
      data-capped={capped || undefined}
      title={`Thinking for ${total}`}
    >
      {Array.from({ length: completed }, (_, i) => (
        <span key={`filled-${i}`} className={styles.cell} data-filled="" />
      ))}
      {!capped && (
        // Keyed on the minute so each new minute mounts a fresh faint cell that fades
        // in, rather than the previous one fading back out.
        <span
          key={`current-${completed}`}
          className={`${styles.cell} ${styles.fading}`}
          style={{ opacity: 0.35 + 0.65 * fraction }}
        />
      )}
      {Array.from({ length: capped ? 0 : CAP_MINUTES - completed - 1 }, (_, i) => (
        <span key={`empty-${i}`} className={styles.cell} />
      ))}
    </span>
  )
}
```

- [ ] **Step 2: Write the styles**

Create `src/ui/ThinkingBar.module.css`:

```css
.bar {
  display: flex;
  gap: 3px;
  width: 100%;
  align-items: center;
}

.cell {
  flex: 1;
  height: 5px;
  border-radius: 999px;
  /* An unfilled minute reads as a faint track of the team colour. */
  background: color-mix(in srgb, var(--cell-color) 18%, transparent);
}

.cell[data-filled] {
  background: var(--cell-color);
}

/* The current minute: full team colour whose opacity is stepped inline each second,
   so it reads as quietly filling in. */
.fading {
  background: var(--cell-color);
  transition: opacity 1s linear;
}

.bar[data-team='red'] {
  --cell-color: var(--red);
}

.bar[data-team='blue'] {
  --cell-color: var(--blue);
}

/* Ten minutes in: the clock has stopped and nobody's thinking — drain the colour
   so the frozen bar reads as abandoned, not active. */
.bar[data-capped] {
  --cell-color: #9aa0a6;
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run build`
Expected: PASS (`tsc` clean, `vite build` succeeds). The new component is unused so far, which is fine.

- [ ] **Step 4: Commit**

```bash
git add src/ui/ThinkingBar.tsx src/ui/ThinkingBar.module.css
git commit -m "Add ThinkingBar: the thinking clock as a fixed ten-cell bar"
```

---

### Task 2: Move the spymaster's clock under the clue form

Switch `ClueBar` to render `ThinkingBar` on its own row beneath the input row, so the beads no longer push the focus toggle / word / count / submit rightward.

**Files:**
- Modify: `src/ui/ClueBar.tsx` (import at line 3; the `<ThinkingBeads team={props.turn} />` at line 41; the `return (<form …>` wrapper)
- Modify: `src/ui/ClueBar.module.css` (add a `.clueBar` column wrapper rule)

**Interfaces:**
- Consumes: `ThinkingBar` from `./ThinkingBar` (Task 1).
- Produces: no new exports; `ClueBar`'s public props are unchanged.

- [ ] **Step 1: Swap the import**

In `src/ui/ClueBar.tsx`, change line 3 from:

```tsx
import ThinkingBeads from './ThinkingBeads'
```

to:

```tsx
import ThinkingBar from './ThinkingBar'
```

- [ ] **Step 2: Wrap the form in a column and move the clock underneath**

In `src/ui/ClueBar.tsx`, change the top of the returned JSX. Replace:

```tsx
  return (
    <form
      className={styles.clueForm}
      data-team={props.turn}
      onSubmit={(event) => {
        event.preventDefault()
        if (word.trim()) {
          props.onClue(word.trim(), unlimited ? INFINITE_CLUE : count)
          setWord('')
        }
      }}
    >
      <ThinkingBeads team={props.turn} />
      <button
        type="button"
        className={styles.focusToggle}
```

with:

```tsx
  return (
    <div className={styles.clueBar}>
      <form
        className={styles.clueForm}
        data-team={props.turn}
        onSubmit={(event) => {
          event.preventDefault()
          if (word.trim()) {
            props.onClue(word.trim(), unlimited ? INFINITE_CLUE : count)
            setWord('')
          }
        }}
      >
        <button
          type="button"
          className={styles.focusToggle}
```

Then find the form's closing tag at the end of the return (currently `</form>\n  )`) and replace it with:

```tsx
      </form>
      <ThinkingBar team={props.turn} />
    </div>
  )
```

Note: the remaining JSX between the focus toggle and the old `</form>` (the word input, `.fields` div, etc.) is unchanged — only its indentation shifts by two spaces, which the linter/formatter will settle. If you prefer, leave inner indentation as-is; nesting is what matters, not whitespace.

- [ ] **Step 3: Add the column wrapper style**

In `src/ui/ClueBar.module.css`, add above the existing `.clueForm` rule (after `.bar` at the top):

```css
.clueBar {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: stretch;
}
```

The column's width is set by its widest child (the form row), and `align-items: stretch` makes `ThinkingBar` span that same width. The mobile `@media (max-width: 640px)` `flex-wrap: nowrap` rule on `.clueForm` is untouched.

- [ ] **Step 4: Build and run the suite**

Run: `npm run build && npm test`
Expected: PASS. The clue-giving flows (`giveClue`) still work — the textbox, spinbutton, and "Give clue" button are unchanged; only their container gained a sibling row.

- [ ] **Step 5: Commit**

```bash
git add src/ui/ClueBar.tsx src/ui/ClueBar.module.css
git commit -m "Dock the spymaster's thinking clock under the clue form"
```

---

### Task 3: Move the operatives' clock under the status pill

Take `ThinkingBar` out of the inline clue token and give it its own full-width row inside the status pill.

**Files:**
- Modify: `src/ui/GameScreen.tsx` (import; the `<ThinkingBeads … />` at line 473 inside the `.clueInline` span)
- Modify: `src/ui/GameScreen.module.css` (add a `.turnClock` full-width row rule)

**Interfaces:**
- Consumes: `ThinkingBar` from `./ThinkingBar` (Task 1).
- Produces: no new exports.

- [ ] **Step 1: Swap the import**

In `src/ui/GameScreen.tsx`, change line 8 from:

```tsx
import ThinkingBeads from './ThinkingBeads'
```

to:

```tsx
import ThinkingBar from './ThinkingBar'
```

- [ ] **Step 2: Remove the clock from inside `.clueInline`**

In `src/ui/GameScreen.tsx`, delete this block (currently lines 470–474, the last child inside the `<span className={styles.clueInline}>`):

```tsx
                  {/* How long this team's operatives have deliberated — the same clock
                      the spymaster gets, keyed on the clue so it restarts each turn. */}
                  {acting === 'operatives' && mineTurn && props.mySeat === null && (
                    <ThinkingBeads key={props.game.state.clueHistory.length} team={turn} />
                  )}
```

- [ ] **Step 3: Add the clock as a full-width row after `.clueInline`**

Still in `src/ui/GameScreen.tsx`, find the `.clueInline` conditional block: it opens with `{!winner && phase === 'guess' && clue && (` (former line 430), its `<span className={styles.clueInline}>` closes at former line 475, and the conditional itself closes with `)}` on former line 476. Insert the new block on the line **after** that `)}` and **before** the fragment's closing `</>` (former line 477), so the clock becomes a sibling of `.clueInline` inside the same `<>…</>` fragment (a fragment adds no DOM node, so its children are direct flex children of `.statusPill`):

```tsx
              {!winner && phase === 'guess' && clue && acting === 'operatives' && mineTurn && props.mySeat === null && (
                // Its own full-width row under the clue token — the same clock the
                // spymaster gets, keyed on the clue so it restarts each turn.
                <div className={styles.turnClock}>
                  <ThinkingBar key={props.game.state.clueHistory.length} team={turn} />
                </div>
              )}
```

The guard repeats `!winner && phase === 'guess' && clue` (the conditions that gated the enclosing `.clueInline` block) plus the operatives conditions that gated the clock itself, because the row is now a sibling of `.clueInline` rather than a child of it.

- [ ] **Step 4: Add the full-width row style**

In `src/ui/GameScreen.module.css`, add after the `.statusPill` block (near line 320):

```css
/* Drops the thinking clock onto its own line beneath the clue token — the pill
   already wraps, and a full-basis child forces the break. */
.turnClock {
  flex-basis: 100%;
  display: flex;
}
```

- [ ] **Step 5: Build and run the suite**

Run: `npm run build && npm test`
Expected: PASS. The operatives-flow specs (e.g. `marking.spec.ts`, `clueHistory.spec.ts`) still pass — the status text, clue word, and pips are unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/ui/GameScreen.tsx src/ui/GameScreen.module.css
git commit -m "Dock the operatives' thinking clock under the status pill"
```

---

### Task 4: Delete the old `ThinkingBeads` and verify

Remove the now-unused component and confirm nothing references it, then verify the whole change end to end.

**Files:**
- Delete: `src/ui/ThinkingBeads.tsx`
- Delete: `src/ui/ThinkingBeads.module.css`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

- [ ] **Step 1: Confirm there are no remaining references**

Run: `grep -rn "ThinkingBeads" src test`
Expected: no output (empty). If anything prints, fix that call site to use `ThinkingBar` before deleting.

- [ ] **Step 2: Delete the old files**

```bash
git rm src/ui/ThinkingBeads.tsx src/ui/ThinkingBeads.module.css
```

- [ ] **Step 3: Build and run the full suite**

Run: `npm run build && npm test`
Expected: PASS (clean `tsc`, `vite build` succeeds, all Playwright specs green).

- [ ] **Step 4: Manual visual verification (both usages)**

Run: `npm run dev`, open the app, host a room, and check by eye:
- **Spymaster:** while it's your turn to give a clue, the thinking bar sits as a thin ten-cell bar directly **under** the clue form. The focus toggle, word input, count spinner, and submit button do **not** shift right over time. A fresh current cell fades in as the seconds pass.
- **Operatives:** after a clue is given, on your guessing turn the same bar sits on its own row **under** the status pill's clue token, and the clue word + pips do not widen as time passes.
- At the ten-minute cap the whole bar greys out.

The timer's second-by-second visual (fade-in, per-minute beep, ten-minute grey-out) is verified here by eye — consistent with the component's existing (zero) automated coverage; the Playwright suite guards the structural placement by exercising the clue-give and operatives flows around it.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Remove the old ThinkingBeads clock, superseded by ThinkingBar"
```
