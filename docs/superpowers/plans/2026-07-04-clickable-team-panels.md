# Clickable Team Panels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the header team panels the direct control surface for who you are — click a team's count card to join it as an operative, click its spymaster slot to become (or step down as) its spymaster — with a confirm only mid-game; and flatten the menu to a direct list of new-game sources with a subtle `+` toggle.

**Architecture:** A new pure-function query DSL over `GameState` (`inProgress`/`isFresh`/`remaining`) plus a `gameView(state)` wrapper gives read-sites `game.something` ergonomics while the plain record stays the P2P/serialization format. A new `setTeam` message on the P2P `Session` lets an operative override their host-assigned team. `GameScreen` renders the two clickable buttons per team and collapses the menu.

**Tech Stack:** React 18 + TypeScript, Vite, PeerJS (WebRTC), Playwright (e2e only — there is no unit runner; the DSL is covered through UI tests).

## Global Constraints

- Props typed inline and accessed via `props.x` (no destructuring of the props object).
- Component styles live in the co-located `X.module.css`; only theme vars are global.
- `GameState` MUST stay a plain JSON-serializable record — it is the P2P wire format and the `sessionStorage` shape. The `gameView` wrapper is created only at the React read boundary and is NEVER serialized or sent over the wire.
- Tests drive the app only as a user would: role-based locators (`getByRole`, `getByText` only when no role fits), no reaching into storage/state, read the address bar via `page.url()`.
- No conditionals in tests or the Page Object Model. POM methods start with a verb; a query and an action are separate methods (no self-deciding `toggle`).
- Inline one-off literals (confirm strings, emoji); do not extract named constants for single-use values.

---

### Task 1: Game query DSL (`gameView`) and adopt it in GameScreen

Pure refactor — no behavior change. Introduces the DSL and routes GameScreen's existing inline derivations through it. Verified by the existing e2e suite staying green.

**Files:**
- Create: `src/game/gameView.ts`
- Modify: `src/ui/GameScreen.tsx` (`freshBoard` at :40, `remaining` helper at :81-82 and its call at :119, `confirmNewGame` at :154-157)

**Interfaces:**
- Produces:
  - `inProgress(game: GameState): boolean`
  - `isFresh(game: GameState): boolean`
  - `remaining(game: GameState, team: Team): number`
  - `gameView(state: GameState): GameView` where `GameView` extends `GameState` and adds `readonly inProgress: boolean`, `readonly isFresh: boolean`, `remaining(team: Team): number`

- [ ] **Step 1: Create the DSL module**

Create `src/game/gameView.ts`:

```ts
import type { GameState, Team } from './createGame'

// A game is "in progress" once it has committed to a line of play — a clue is
// out or a card is revealed — and hasn't ended. A won game, or a fresh deal, is
// safe to walk away from (switch team, re-deal) without a prompt.
export const inProgress = (game: GameState): boolean =>
  !game.winner && (game.clue !== null || game.cards.some((card) => card.revealed))

// A freshly dealt board: nothing revealed yet.
export const isFresh = (game: GameState): boolean =>
  game.cards.every((card) => !card.revealed)

// Cards a team still has to find.
export const remaining = (game: GameState, team: Team): number =>
  game.cards.filter((card) => card.color === team && !card.revealed).length

export interface GameView extends GameState {
  readonly inProgress: boolean
  readonly isFresh: boolean
  remaining(team: Team): number
}

// A thin read-only view so callers read domain questions as `game.inProgress`,
// `game.isFresh`, `game.remaining('red')` while the underlying fields stay
// reachable. Created at the read boundary only; never serialized or sent.
export const gameView = (state: GameState): GameView => ({
  ...state,
  get inProgress() {
    return inProgress(state)
  },
  get isFresh() {
    return isFresh(state)
  },
  remaining: (team) => remaining(state, team),
})
```

- [ ] **Step 2: Route GameScreen's derivations through the view**

In `src/ui/GameScreen.tsx`:

Add the import near the other game imports at the top:

```ts
import { gameView } from '../game/gameView'
```

Just inside the component body, before `freshBoard`, wrap the incoming state:

```ts
  const game = gameView(props.state)
```

Replace the `freshBoard` line (:40):

```ts
  const freshBoard = game.isFresh
```

Delete the `remaining` helper (:81-82):

```ts
  const remaining = (color: string): number =>
    props.state.cards.filter((card) => card.color === color && !card.revealed).length
```

and change its only call inside `renderTeam` (:119) from `{remaining(team)}` to:

```tsx
          {game.remaining(team)}
```

Replace the `inProgress` expression inside `confirmNewGame` (:155):

```ts
    const inProgress = game.inProgress
```

- [ ] **Step 3: Run the full e2e suite to confirm no regression**

Run: `npm run test:e2e`
Expected: PASS (same set as before this task — pure refactor).

- [ ] **Step 4: Commit**

```bash
git add src/game/gameView.ts src/ui/GameScreen.tsx
git commit -m "Add game query DSL (gameView) and use it for GameScreen derivations"
```

---

### Task 2: Join a team by clicking its count card

The count badge becomes a "Join {team} team" button. Operatives can move sides; a mid-game switch confirms first, a fresh/finished one goes straight through. Backed by a new `setTeam` message on the P2P session.

**Files:**
- Modify: `src/net/peerMultiplayer.ts` (`Session` interface :13-20, host `startHost` internals + resolve object, guest `join` resolve object)
- Modify: `src/App.tsx` (`joinTeam` handler, pass `onJoinTeam` to GameScreen)
- Modify: `src/ui/GameScreen.tsx` (props type, `requestJoinTeam` handler, count badge JSX in `renderTeam`)
- Modify: `src/ui/GameScreen.module.css` (make `.count` a button, hover affordance)
- Modify: `test/gamePage.ts` (add `joinTeam`)
- Test: `test/team.spec.ts` (new)

**Interfaces:**
- Consumes: `gameView` / `game.inProgress` from Task 1.
- Produces:
  - `Session.setTeam(team: Team): void`
  - GameScreen prop `onJoinTeam: (team: Team) => void`
  - POM `joinTeam(team: 'red' | 'blue'): Promise<void>`
  - Button accessible name `Join ${team} team`

- [ ] **Step 1: Write the failing test**

Create `test/team.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import { GamePage, stubUnsplash } from './gamePage'

// The host opens already holding the red spymaster seat, so it sees colours.
// Joining blue on a fresh board switches sides immediately (no prompt): as a
// blue operative the host no longer sees any card's colour.
test('clicking the other team on a fresh board joins it directly', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()

  await expect(game.getCard('red').first()).toBeVisible()
  await game.joinTeam('blue')

  await expect(game.getByRoleStatus()).toHaveText(/joined blue/i)
  await expect(game.getCard('red')).toHaveCount(0)
})

// Mid-game (a clue is out) switching asks first; accepting moves you.
test('switching teams mid-game confirms, and accepting joins', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()
  await game.giveClue('anchor', 1)

  page.once('dialog', (dialog) => dialog.accept())
  await game.joinTeam('blue')

  await expect(game.getCard('red')).toHaveCount(0)
})

// Mid-game, dismissing the prompt keeps you where you were (still see colours).
test('switching teams mid-game can be cancelled', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()
  await game.giveClue('anchor', 1)

  page.once('dialog', (dialog) => dialog.dismiss())
  await game.joinTeam('blue')

  await expect(game.getCard('red').first()).toBeVisible()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:e2e -- team.spec.ts`
Expected: FAIL — `game.joinTeam` / `game.getByRoleStatus` are not defined.

- [ ] **Step 3: Add `setTeam` to the P2P session**

In `src/net/peerMultiplayer.ts`:

Add to the `Session` interface (after `setSpymaster`, :17):

```ts
  setTeam: (team: Team) => void
```

Add the guest message type beside `Presence` (:22):

```ts
type TeamClaim = { __team: true; team: Team }
```

In `startHost`, add an internal setter next to `assignTeam` (after :103). Joining a team as an operative also drops any spymaster seat that peer held:

```ts
    // A player overriding their auto-assigned team, as an operative. Dropping to
    // an operative on the new side means giving up any spymaster seat first.
    const setTeamFor = (peerId: string, team: Team) => {
      teams[peerId] = team
      claimSeat(peerId, null)
    }
```

Add `setTeam` to the host's resolved session object (after `setSpymaster`, :180):

```ts
        setTeam: (team) => {
          setTeamFor(peer.id, team)
          broadcast()
        },
```

Handle the guest message in the host's `connection.on('data')` (extend the branch at :200-204):

```ts
        if ((data as Ping).__ping) return // guest keepalive
        if ((data as Presence).__presence) {
          claimSeat(connection.peer, (data as Presence).spymasterTeam)
        } else if ((data as TeamClaim).__team) {
          setTeamFor(connection.peer, (data as TeamClaim).team)
        } else {
          state = applyAction(state, data as Action)
        }
        broadcast()
```

Add `setTeam` to the guest's resolved session object (after `setSpymaster`, :257-258):

```ts
          setTeam: (team) =>
            connection.send({ __team: true, team } satisfies TeamClaim),
```

- [ ] **Step 4: Add the App handler and pass it down**

In `src/App.tsx`, add a handler beside `claimSeat` (after :132):

```ts
  const joinTeam = (team: Team) => {
    sessionRef.current?.setTeam(team)
    notify(`You joined ${team} ${team === 'red' ? '🔴' : '🔵'}`)
  }
```

Pass it to `<GameScreen>` (in the props around :275, next to `onClaimSeat`):

```tsx
          onClaimSeat={claimSeat}
          onJoinTeam={joinTeam}
```

- [ ] **Step 5: Add the prop, handler, and count-card button in GameScreen**

In `src/ui/GameScreen.tsx`, add to the props type (after `onClaimSeat`, :16):

```ts
  onJoinTeam: (team: Team) => void
```

Add the request handler near the other handlers (after the `game` line from Task 1):

```ts
  // Clicking a team's card joins it as an operative. Already a plain operative
  // there? Nothing to do. Moving to the other side mid-game confirms first;
  // dropping from your own spymaster seat to operative on the same side doesn't.
  const requestJoinTeam = (team: Team) => {
    if (team === props.myTeam && props.mySeat === null) return
    if (team !== props.myTeam && game.inProgress && !window.confirm(`Switch to the ${team} team?`)) return
    props.onJoinTeam(team)
  }
```

In `renderTeam`, replace the count `<span>` (:118-120) with a button:

```tsx
        <button
          type="button"
          className={styles.count}
          data-team={team}
          aria-label={`Join ${team} team`}
          onClick={() => requestJoinTeam(team)}
        >
          {game.remaining(team)}
        </button>
```

- [ ] **Step 6: Make `.count` a button in CSS**

In `src/ui/GameScreen.module.css`, extend the `.count` rule (:119-130) with a button reset and pointer, keeping the card look:

```css
.count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 24px;
  border-radius: 5px;
  color: #fff;
  font-weight: 800;
  font-size: 1rem;
  padding: 0;
  border: none;
  appearance: none;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(43, 45, 66, 0.25);
}

.count:hover {
  filter: brightness(1.08);
}
```

- [ ] **Step 7: Add POM helpers**

In `test/gamePage.ts`, add to the `GamePage` class:

```ts
  // The little team-coloured count card doubles as "join this team".
  async joinTeam(team: 'red' | 'blue'): Promise<void> {
    await this.page.getByRole('button', { name: `Join ${team} team` }).click()
  }

  // The transient toast / sticky announcement shown in the header status pill.
  getByRoleStatus() {
    return this.page.getByRole('status')
  }
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm run test:e2e -- team.spec.ts`
Expected: PASS (all three tests).

- [ ] **Step 9: Run the full suite to confirm no regression**

Run: `npm run test:e2e`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/net/peerMultiplayer.ts src/App.tsx src/ui/GameScreen.tsx src/ui/GameScreen.module.css test/gamePage.ts test/team.spec.ts
git commit -m "Join a team by clicking its count card, with a mid-game confirm"
```

---

### Task 3: Claim / step down as spymaster from the header slot

Each team always shows a spymaster slot (solid 🕵️ filled, dim when empty). Click to take the seat (confirming mid-game) or, if it's yours, to step down. The "I'm spymaster" picker leaves the menu. The POM's spymaster helpers now drive the header.

**Files:**
- Modify: `src/ui/GameScreen.tsx` (`requestSpymaster` handler, `renderTeam` players block :121-147, remove the `seatPicker` block from `renderMenuItems` :165-187)
- Modify: `src/ui/GameScreen.module.css` (add `.spymasterSlot`, `.emptySpy`; split the `.spymasterIcon, .ops` rule; remove `.seatPicker`/`.seatLabel`/`.seatButtons`/`.seatButton`)
- Modify: `test/gamePage.ts` (`enableSpymaster`/`releaseSpymaster` drive the header; drop `toggleSeat`)
- Test: `test/spymaster.spec.ts` (new)

**Interfaces:**
- Consumes: `game.inProgress` (Task 1); existing `props.onClaimSeat`, `props.mySeat`.
- Produces:
  - Spymaster slot button accessible name `Become ${team} spymaster` (empty or someone else's) / `Step down as ${team} spymaster` (mine).
  - Filled slot still contains `<span role="img" aria-label="${team} spymaster">` so `countPlayers()` keeps working.
  - POM `enableSpymaster(team?)` (accepts a confirm dialog), `releaseSpymaster(team?)` (no dialog).

- [ ] **Step 1: Write the failing test**

Create `test/spymaster.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import { GamePage, stubUnsplash } from './gamePage'

// Taking the blue seat from the header makes the host the blue spymaster; the
// toast announces it. Stepping down again drops back to an operative, who sees
// no colours.
test('becoming and stepping down as spymaster from the header', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()

  await game.enableSpymaster('blue')
  await expect(game.getByRoleStatus()).toHaveText(/blue spymaster/i)

  await game.releaseSpymaster('blue')
  await expect(game.getCard('red')).toHaveCount(0)
})

// The "I'm spymaster" picker is gone from the menu — the header owns it now.
test('the menu no longer offers a spymaster picker', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()

  await game.openMenu()
  await expect(game.findMenu().getByText(/spymaster/i)).toHaveCount(0)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:e2e -- spymaster.spec.ts`
Expected: FAIL — `enableSpymaster` still opens the (soon-removed) menu picker; the header has no spymaster button yet.

- [ ] **Step 3: Add the spymaster request handler**

In `src/ui/GameScreen.tsx`, near `requestJoinTeam`:

```ts
  // Clicking a team's spymaster slot claims the seat (stealing it if held) —
  // confirming first mid-game. Clicking your own seat steps you down, which is
  // never gated.
  const requestSpymaster = (team: Team) => {
    if (props.mySeat === team) {
      props.onClaimSeat(null)
      return
    }
    if (game.inProgress && !window.confirm(`Take the ${team} spymaster seat?`)) return
    props.onClaimSeat(team)
  }
```

- [ ] **Step 4: Render the always-present slot button**

In `renderTeam`, replace the players block (:121-147) so the spymaster is a button that's always rendered:

```tsx
        <span
          className={styles.players}
          title={`${headcount} ${team} player${headcount === 1 ? '' : 's'}`}
        >
          <button
            type="button"
            className={styles.spymasterSlot}
            data-team={team}
            data-filled={hasSpymaster || undefined}
            data-active={(active && phase === 'clue') || undefined}
            aria-label={props.mySeat === team ? `Step down as ${team} spymaster` : `Become ${team} spymaster`}
            onClick={() => requestSpymaster(team)}
          >
            {hasSpymaster ? (
              <span role="img" aria-label={`${team} spymaster`}>
                🕵️
              </span>
            ) : (
              <span className={styles.emptySpy} aria-hidden="true">
                🕵️
              </span>
            )}
          </button>
          <span
            className={styles.ops}
            data-team={team}
            data-active={(active && phase === 'guess') || undefined}
          >
            {Array.from({ length: ops }, (_, i) => (
              <span key={i} role="img" aria-label={`${team} operative`}>
                {winner && winner !== team ? '😢' : '🙂'}
              </span>
            ))}
          </span>
        </span>
```

- [ ] **Step 5: Remove the seat picker from the menu**

In `renderMenuItems`, delete the entire `seatPicker` block (:165-187) — the `<div className={styles.seatPicker}>…</div>`. Leave the `newGame` block for now (Task 4 handles it).

- [ ] **Step 6: Update the CSS**

In `src/ui/GameScreen.module.css`:

Split the shared sizing rule (:102-110) so the slot button carries it:

```css
.spymasterSlot,
.ops {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 2px 3px;
  border-radius: 999px;
}

.spymasterSlot {
  border: none;
  background: transparent;
  box-shadow: none;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
}

.spymasterSlot:hover {
  background: color-mix(in srgb, var(--ink) 8%, transparent);
}

/* An unclaimed seat: a faint prompt that the chair is open. */
.emptySpy {
  opacity: 0.32;
}
```

Delete the now-dead seat-picker rules (`.seatPicker`, `.seatLabel`, `.seatButtons`, `.seatButton`, and the `.seatButton[...]`/`.seatButton:disabled` variants) at :281-326.

- [ ] **Step 7: Point the POM's spymaster helpers at the header**

In `test/gamePage.ts`, replace the `toggleSeat`/`enableSpymaster`/`releaseSpymaster` block (:123-137) with header-driven, single-purpose methods:

```ts
  // Take a spymaster seat from the header (defaults to the team on turn, since
  // only that team's spymaster may clue). Accepts the mid-game confirm, as a
  // user taking the seat would; on a fresh board no prompt appears.
  async enableSpymaster(team?: 'red' | 'blue'): Promise<void> {
    const side = team ?? (await this.getCurrentTurn())
    this.page.once('dialog', (dialog) => dialog.accept())
    await this.page.getByRole('button', { name: `Become ${side} spymaster` }).click()
  }

  // Step down to play as an operative again (defaults to the turn's team).
  // Stepping down is never gated by a prompt.
  async releaseSpymaster(team?: 'red' | 'blue'): Promise<void> {
    const side = team ?? (await this.getCurrentTurn())
    await this.page.getByRole('button', { name: `Step down as ${side} spymaster` }).click()
  }
```

- [ ] **Step 8: Run the new test to verify it passes**

Run: `npm run test:e2e -- spymaster.spec.ts`
Expected: PASS.

- [ ] **Step 9: Run the full suite (spymaster POM change ripples widely)**

Run: `npm run test:e2e`
Expected: PASS — `sync`, `refresh`, `marking`, `endgame`, `feedback`, `guessing`, `words`, `players` all rely on `enableSpymaster`/`releaseSpymaster` and `countPlayers`.

- [ ] **Step 10: Commit**

```bash
git add src/ui/GameScreen.tsx src/ui/GameScreen.module.css test/gamePage.ts test/spymaster.spec.ts
git commit -m "Claim or step down as spymaster from the header slot; drop the menu picker"
```

---

### Task 4: Explode the new-game sources into the menu

Drop the nested "New game" toggle and its expandable list; the menu shows the source buttons directly, each starting a fresh game from that source (still confirming an overwrite mid-game).

**Files:**
- Modify: `src/ui/GameScreen.tsx` (remove `sourceOpen` state :25 and its `setSourceOpen(false)` uses; rewrite `renderMenuItems`'s `newGame` block :188-216)
- Modify: `src/ui/GameScreen.module.css` (remove `.newGame`; keep `.sourceList`)
- Modify: `test/gamePage.ts` (`startGameWithSource` clicks the source directly)
- Test: `test/provider.spec.ts` and `test/words.spec.ts` already exercise this — no new test; they must stay green.

**Interfaces:**
- Consumes: existing `props.providers`, `props.providerId`, `props.onProviderChange`, `props.onNewGame`, and `confirmNewGame`.
- Produces: POM `startGameWithSource(label)` = open menu, click the source button.

- [ ] **Step 1: Flatten the menu markup**

In `src/ui/GameScreen.tsx`, replace the `newGame` block inside `renderMenuItems` (:188-216) with the source list directly:

```tsx
          <div className={styles.sourceList}>
            {props.providers.map((provider) => (
              <button
                key={provider.id}
                type="button"
                data-current={provider.id === props.providerId || undefined}
                onClick={() => {
                  if (!confirmNewGame()) return
                  props.onProviderChange(provider.id)
                  props.onNewGame(provider.id)
                  setMenuOpen(false)
                }}
              >
                {provider.label}
              </button>
            ))}
          </div>
```

- [ ] **Step 2: Remove the `sourceOpen` state**

Delete the `sourceOpen` state declaration (:25):

```ts
  const [sourceOpen, setSourceOpen] = useState(false)
```

Remove the `setSourceOpen(false)` call in the center menu-toggle `onClick` (:320) so it reads:

```tsx
        onClick={() => {
          setMenuOpen((open) => !open)
        }}
```

- [ ] **Step 3: Remove the dead `.newGame` rule**

In `src/ui/GameScreen.module.css`, delete the `.newGame` rule (:254-257). Keep `.sourceList` and its `button` variants (:259-279).

- [ ] **Step 4: Update the POM**

In `test/gamePage.ts`, replace `startGameWithSource` (:116-121) — the sources are shown directly now, and a mid-game re-deal confirms:

```ts
  // Start a new game from a specific card source: the menu lists the sources
  // directly. A re-deal over a game in progress prompts; accept it.
  async startGameWithSource(label: string): Promise<void> {
    await this.openMenu()
    this.page.once('dialog', (dialog) => dialog.accept())
    await this.page.getByRole('button', { name: label, exact: true }).click()
  }
```

- [ ] **Step 5: Run the affected specs to verify they pass**

Run: `npm run test:e2e -- provider.spec.ts words.spec.ts`
Expected: PASS.

- [ ] **Step 6: Run the full suite**

Run: `npm run test:e2e`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/ui/GameScreen.tsx src/ui/GameScreen.module.css test/gamePage.ts
git commit -m "Explode the new-game sources directly into the menu"
```

---

### Task 5: Subtle `+` toggle and confirm the auto-close machinery

Swap the compact menu glyph `☰` for a subtle `+`, and confirm what the flatter menu still needs to close itself. The outside-click listener stays (`menu.spec` depends on it — clicking the clue input must close an open menu); `stopPropagation` on the menu items stays (so clicking a source doesn't close the menu before it acts). Only the `sourceOpen` bits are gone, already removed in Task 4.

**Files:**
- Modify: `src/ui/GameScreen.tsx` (the `☰` glyph at :324; confirm the auto-close effect at :90-95 and the `stopPropagation` at :163 remain)
- Modify: `src/ui/GameScreen.module.css` (add `.plus`)
- Test: `test/menu.spec.ts` already covers the outside-click close — must stay green.

**Interfaces:**
- Consumes: nothing new.
- Produces: the compact toggle renders `<span className={styles.plus} aria-hidden="true">+</span>`; the button keeps its `title="Menu"` accessible name.

- [ ] **Step 1: Swap the glyph**

In `src/ui/GameScreen.tsx`, in the center toggle's content (:323-324), replace the `'☰'` branch:

```tsx
        {clueForm ? (
          <span className={styles.plus} aria-hidden="true">
            +
          </span>
        ) : props.flash ? (
```

- [ ] **Step 2: Style the subtle `+`**

In `src/ui/GameScreen.module.css`, add:

```css
/* A quiet "+" that opens the menu (mostly "new game") beside the clue input. */
.plus {
  font-size: 1.4rem;
  font-weight: 400;
  line-height: 1;
  color: var(--muted);
}
```

- [ ] **Step 3: Confirm the auto-close effect and stopPropagation are still present**

Read `src/ui/GameScreen.tsx` and verify these remain unchanged and are still needed:
- The outside-click effect (:90-95) that closes the menu on any `document` click — `menu.spec` ("interacting with the clue input closes an open menu") relies on it.
- `onClick={(event) => event.stopPropagation()}` on the `menuItems` container (:163) — keeps a click on a source from bubbling to that document listener and closing the menu before the handler runs.

No code change if both are present.

- [ ] **Step 4: Run the menu spec to verify close-behavior holds**

Run: `npm run test:e2e -- menu.spec.ts`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `npm run test:e2e`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ui/GameScreen.tsx src/ui/GameScreen.module.css
git commit -m "Use a subtle + for the compact menu toggle"
```

---

## Notes carried from the spec (out of scope here)

- The header's operative emoji are an even 50/50 split of the room's non-spymaster count, not a per-team headcount, so joining a side doesn't change those numbers. The felt feedback is the background tint switching and the "You joined …" toast. Real per-team counts are a separate change.
- `GameState` gains no stored `started`/`unstarted` field — "in progress" stays derived (`game.inProgress`), since the log already records progress.
