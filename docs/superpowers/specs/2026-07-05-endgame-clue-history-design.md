# End-of-game clue history & clue max length

## Goal

Two changes to the game:

1. **Clue history at game end.** When a game finishes, show the clues each team
   gave during the game — one block per team, at the top, one on each side.
2. **Clue max length.** Cap the spymaster's clue word at 20 characters.

## Context

- Clues are modelled by `Clue { team, word, count }` in `src/Game.ts`. `GameState`
  keeps only the *current* clue (`clue: Clue | null`) plus a flat string `log`.
  There is no per-team clue history today.
- The end-of-game state is `state.winner: Team | null`.
- The header (`src/ui/GameScreen.tsx`) already lays out `headerSide` left (red)
  and right (blue) around a centre pill — a natural home for one block per team.
- The clue input lives in `src/ui/ClueBar.tsx` and has `pattern="\S+"` but no
  `maxLength`.
- Tests are Playwright E2E driven through the `GamePage` POM, using role-based
  locators. No unit tests exist; testing stays end-to-end.

## Design

### 1. Data model — `src/Game.ts`

Add a typed history instead of parsing the string `log`:

- Add `readonly clueHistory: readonly Clue[]` to `GameState`.
- `createGame` initialises `clueHistory: []`. A new game / rematch goes through
  `createGame`, so history resets automatically.
- `giveClue` appends the new clue:
  `clueHistory: [...this.s.clueHistory, { team: this.s.turn, word, count }]`.

The field serialises over the PeerJS wire and sessionStorage with no extra work,
same as the rest of `GameState`.

### 2. Rendering — `src/ui/GameScreen.tsx`

`renderSide(team)` chooses what a header side shows:

- **Game in progress** → `renderTeam(team)` (cards-left count + players), unchanged.
- **`winner` set** → new `renderClues(team)`: the team's clues from
  `clueHistory.filter(c => c.team === team)`, each row rendered `word · count`
  reusing the existing `clueWord` / `clueDot` / `clueValue` styling, tinted to the
  team. A team with no clues shows a discreet placeholder (`—`).

The list is a `<ul>` with `aria-label="red clues"` / `"blue clues"` and one `<li>`
per clue, so tests can locate it by role
(`getByRole('list', { name: 'red clues' })`).

### 3. Styles — `src/ui/GameScreen.module.css`

New `.clueLog`: a vertical list, team-tinted, left-aligned on the red (left) side
and right-aligned on the blue (right) side. The header grows in height at game end;
with at most ~8–9 clues per side there is no need for scrolling.

### 4. Max length — `src/ui/ClueBar.tsx`

Add `maxLength={20}` to the clue word input, alongside the existing `pattern="\S+"`.

## Testing (Playwright E2E)

- **POM** (`test/gamePage.ts`): add `getTeamClues(team)` reading the clue list via
  its role/label.
- **New spec** (`test/clueHistory.spec.ts`): play a short game to a win with a
  couple of clues on each side, then assert both header blocks show the expected
  clues at the top.
- **Max length**: type more than 20 characters into the clue input with
  `pressSequentially` (real key presses honour `maxlength`; `fill` bypasses it) and
  assert the value is capped at 20 via `toHaveValue`.

## Out of scope (YAGNI)

- Showing clue history *during* play.
- Marking which clues were guessed correctly.
- Enforcing the cap inside `giveClue` — the input `maxLength` covers the real flow.
