# Codenames Pictures — P2P Web Game — Design

**Date:** 2026-07-02
**Status:** Approved for MVP

## Summary

A browser-based, peer-to-peer implementation of the *Codenames Pictures* board
game. No backend: players connect directly via WebRTC (PeerJS), with the room
host holding authoritative game state. The app is a static Vite + React build
deployable to GitHub Pages / Netlify.

Card images come from the Unsplash API (fetched client-side by the host, shared
to peers so everyone sees identical cards).

## Game Rules (Pictures variant)

- **Board:** 20 photo cards in a 5×4 grid.
- **Teams:** Red & Blue.
- **Key card** (secret color assignment): 8 for the starting team, 7 for the
  other team, 4 neutral bystanders, 1 assassin. (8 + 7 + 4 + 1 = 20)
- **Roles:** each team has ≥1 spymaster and ≥1 operative.
- **Turn:** the active team's spymaster gives a one-word clue + a number.
  Operatives then click cards:
  - Own team's color → keep guessing (up to number + 1 guesses).
  - Neutral bystander → turn ends.
  - Enemy color → turn ends (and helps the enemy).
  - Assassin → the guessing team **loses immediately**.
- **Win:** first team to reveal all of its own cards wins. Revealing the
  assassin is an instant loss.

## Architecture

Static single-page app. Networking and image-fetching are **injected ports**, so
`App` is transport-agnostic and the whole slice is testable without real WebRTC.

- **`game/`** — pure game logic, no networking. Types live with their owner (no
  technical-hotspot files): `GameState`, `Card`, `Clue`, `Team`, `CardColor`,
  `GamePhase` in `createGame.ts`; `Action` in `applyAction.ts`.
  - `createGame(images, startingTeam)` → initial `GameState`
  - `applyAction(state, action)` → new `GameState` (validates legality)
  - `viewFor(state, player)` → role-filtered view *(used from the filtering
    increment onward; MVP broadcasts full state)*
- **`net/`** — PeerJS transport, keeping WebRTC at the periphery.
  - `peerMultiplayer.ts` — exports the `Session` interface (`roomCode`,
    `dispatch(action)`, `subscribe(listener)`) plus `host(images)` and
    `join(code)`. Host owns state, applies actions, broadcasts; client sends
    actions and receives state. Broker is the public PeerJS broker by default,
    or a local one when `VITE_PEER_HOST` is set (used by tests).
- **`images/`** — `fetchImages()` returns 20 Unsplash photo URLs; the host
  seeds them into the game so all peers render identical cards. Fallback set if
  the API fails *(deferred past MVP)*.
- **`ui/`** — React screens: Lobby (create/join, pick side), Board (5×4 grid),
  ClueBar, GameOver.
- **`App.tsx`** — orchestration; imports `host`/`join` from `net` and
  `fetchImages` from `images`, and stays transport-agnostic ("dispatch actions,
  render received state").

No technical-hotspot modules (`types`/`utils`/`helpers`/`constants`/`hooks`) — an
ESLint `no-restricted-imports` rule bans importing them; technicalities live with
their owners.

### Networking model

Host-authoritative star topology. The host owns the single serializable
`GameState`. Clients send **actions**; the host validates + applies + rebroadcasts.
Signaling uses the free public PeerJS broker (`0.peerjs.com`); the room code is
the host's peer id.

### Data flow (a guess)

1. Host fetches 20 image URLs, builds board + key, starts game.
2. Host broadcasts state to all peers.
3. Operative clicks card → sends `{ type: 'guess', cardIndex }`.
4. Host validates (correct team's turn, card not already revealed), updates state.
5. Host rebroadcasts new state → all boards update live.

### Error handling

- **Host leaves** → clients show "host left, game over."
- **Client drop** → "reconnecting" indicator.
- **Invalid actions** (wrong turn, already-revealed card) → rejected by the
  authoritative host.
- **Unsplash failure** → fallback image set *(deferred past MVP)*.

## MVP (v0.1) — "shared board that syncs"

The thinnest vertical slice that proves P2P sync + shared images + game logic in
one observable loop.

**In scope:**
- Host *Create* → room code; second tab *Join* by code; connection status shown.
- Host fetches 20 Unsplash photos + generates key (8/7/4/1), broadcasts →
  both tabs show the identical 5×4 grid.
- **"Spymaster view" toggle** overlays the color key on your own screen
  (honor-system — see below).
- Click a card → true color revealed **to everyone**, live.
- Turn indicator (Red/Blue), a simple clue text box that broadcasts.
- Win/loss detection (assassin = instant loss; all of a team's cards found = win).

**Anti-cheat (MVP decision):** honor-system. The host broadcasts full state to
everyone; the "Spymaster view" toggle only reveals the key locally. Operatives
*could* peek. Chosen for fastest first result; real role-filtered views
(`viewFor`) are the next increment.

**Cut from MVP:**
- Real role-filtered views / anti-cheat (`viewFor`)
- Team & role assignment UI beyond "pick a side"
- Multiple spymasters per team
- Host migration
- Reconnect polish
- Unsplash fallback image set

## Roadmap (post-MVP)

1. **Anti-cheat:** real role-filtered views — host sends spymasters the key,
   operatives a redacted view.
2. **Lobby polish:** proper team + role assignment, ready-up.
3. **Resilience:** Unsplash fallback set, reconnect handling.
4. **Host migration:** on host drop, peers detect it, elect a new host (e.g.
   lowest peer id), and re-host from the last full-state snapshot. Enabled by
   keeping `GameState` serializable and pushing full snapshots to a backup peer
   (so the key survives even if the new host was an operative).

## Testing

**Playwright only — one layer of full-stack E2E tests.** Tests drive the real
app in a real browser through the UI (role-based locators), exercising the real
game logic *and* real WebRTC. No unit or component tests — behavior is covered
through the UI.

- **Infrastructure:** Playwright's `webServer` starts the Vite dev server and a
  **local PeerServer** (so WebRTC signaling has no external dependency). The
  Unsplash HTTP call is **route-stubbed** per test for determinism.
- **Locators:** role + accessible name only (`getByRole`, `getByLabel`). Card
  colors are encoded into each card's accessible name under spymaster view
  (`Card 5, assassin`) so cards are findable by role, never CSS/test-id.
- **Page object:** a `GamePage` SUT client hides locators/loops so test bodies
  stay declarative (Arrange/Act/Assert, one behavior per test). Fresh browser
  context per test for isolation.
- **Scenarios:** create-room shows 20 cards; correct guess reveals + keeps turn;
  neutral passes turn; assassin ends the game; two browser contexts on one room
  stay in sync over real WebRTC.
- **Manual check:** the real public broker + live Unsplash are verified by a
  manual two-tab run (the automated suite uses the local broker + stub).

## Deploy

Static Vite build → GitHub Pages / Netlify. Unsplash access key is a build-time
public env var (acceptable for a casual project; rate-limited).
