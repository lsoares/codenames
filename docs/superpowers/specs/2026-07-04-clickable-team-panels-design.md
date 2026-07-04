# Clickable team panels — join a team & claim spymaster from the header

**Date:** 2026-07-04

## Problem

Today a player cannot choose their team: the host auto-assigns everyone to the
smaller side, and the only way to become a spymaster is a "I'm spymaster:
Red/Blue" picker buried in the menu. There is no way to move to the other team
as an operative at all.

We want the two team panels in the header (red on the left, blue on the right)
to be the single, direct control surface for who you are:

- Click the opposite team → join it as an operative.
- Click a team's spymaster slot → become that team's spymaster.

## Interaction design

Each header team panel gains two independent click targets.

### 1. Spymaster slot 🕵️ (per team)

- Always rendered now — solid 🕵️ when the seat is filled, dim/ghost 🕵️ when
  empty — so an empty seat is claimable straight from the header.
- Click an empty or other-player's slot → claim that team's spymaster seat.
  Reuses the existing `claimSeat`, which already steals a held seat.
- Click your own slot (you are that team's spymaster) → step down to operative
  on the same team (toggle, exactly as the menu does today: `mine ? null : team`).
- Claiming the opposite team's seat moves you to that team automatically —
  `myTeam` already derives from the held seat.

### 2. Rest of the panel (card count + operatives)

- Click → join that team as a plain operative, vacating any spymaster seat you
  currently hold.
- No-op when you are already a plain operative on that team.

### Confirmation rule (same for both targets)

- **Direct (no prompt)** when the game is not in progress: no winner *and* no
  clue given *and* no card revealed (a fresh deal), or the game is already won.
- **`window.confirm` first** when a game is in progress. Reuses the same
  `window.confirm` the "New game" action already uses.
  - Team join: `"Switch to the blue team?"`
  - Claim spymaster: `"Take the blue spymaster seat?"`
- **Stepping down** as spymaster is never gated — you are giving up a role, not
  disrupting play.

### Feedback

- A toast via the existing `notify`, e.g. `"You joined blue 🔵"`, mirroring the
  current `"You are the blue spymaster 🕵️"`.
- The real, immediate confirmation is the page background tint switching to the
  new team and the board's turn/perspective updating.
- Note: the header's operative emoji are an even 50/50 cosmetic split today, not
  a per-team headcount, so switching does not change those numbers. Making them
  reflect true membership is out of scope here.

## State & networking (P2P)

The host holds `teams: Record<peerId, Team>` (auto-assigned) and
`seats: { red, blue }` (spymasters). Spymaster claiming already works
end-to-end via `claimSeat` / the `__presence` message. The gap is operative
team switching.

- Add `session.setTeam(team)` to the session API in
  `src/net/peerMultiplayer.ts`.
  - **Guest:** sends a new message (e.g. `{ __team: true, team }`) to the host.
  - **Host:** on that message (and when called locally), sets
    `teams[peerId] = team`, releases any seat that peer holds on the *other*
    team, then `broadcast()`s the updated `RoomView`.
- No change to `applyAction` / `GameState` — team/seat membership lives in the
  room layer, not the game state.

## UI changes

- `src/ui/GameScreen.tsx`
  - `renderTeam` renders a clickable spymaster slot (always present) and a
    clickable panel body. Both are `button`s with `aria-label`s:
    `"Join blue team"`, `"Become blue spymaster"`, `"Step down as blue
    spymaster"`.
  - New handlers wrap `onClaimSeat` and the new team-join call with the
    in-progress confirm guard and the `notify` toast. Centralise the
    "in-progress" check (shared with `confirmNewGame`).
  - **Remove** the "I'm spymaster: Red/Blue" seat picker from the menu.
  - **Explode the "New game" options:** drop the nested "New game" toggle
    button and its expandable source list; render the provider buttons directly
    in the menu, each starting a fresh game from that source (keeping the
    `data-current` marker and the `confirmNewGame` overwrite guard). Remove the
    `sourceOpen` state. The menu is now just this flat list of sources.
  - Wire a new `onJoinTeam(team)` prop (backed by `session.setTeam`) alongside
    the existing `onClaimSeat`.
  - Replace the compact menu-toggle glyph `☰` (shown beside the clue input on
    the spymaster's turn) with a subtle `+` — quieter weight/opacity, reading as
    "new game" now that the menu is mostly sources.
- `src/App.tsx`
  - Pass an `onJoinTeam` handler that calls `sessionRef.current?.setTeam(team)`
    and plays/notifies as appropriate.
- `src/ui/GameScreen.module.css`
  - Add styles for the clickable slot/panel (hover affordance, dim empty slot).
  - Remove dead `seatPicker`, `seatLabel`, `seatButtons`, `seatButton` styles.
  - Remove/repurpose `newGame`, `newGameMain`, `sourceList` styles now that the
    source buttons sit directly in the menu.

## Testing

Playwright, driven only through the UI (role-based locators, no reaching into
state):

- Fresh game: a second player clicks the opposite team panel → their view flips
  to that team (background tint / turn perspective), no confirm dialog.
- In-progress game (a clue given / a card revealed): clicking the opposite team
  panel prompts a confirm; accepting switches, dismissing does not.
- Clicking an empty spymaster slot makes you that team's spymaster (🕵️ becomes
  solid, you see colors); clicking your own slot steps you down.
- Claiming the other team's spymaster moves you to that team.
- The menu no longer offers "I'm spymaster".
- The menu lists the card sources directly (no "New game" toggle step);
  clicking a source starts a fresh game from it, prompting to confirm when a
  game is in progress.

## Out of scope

- Real per-team operative headcounts in the header.
- Confirmation on any menu control (the seat picker is being removed).
