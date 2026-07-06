# Waiting-room water race — "which card fills first?"

## Goal

Give the waiting players a slow-burn side-bet that runs the length of a Codenames
match. During each clue phase, everyone **except the acting spymaster** sees a
pipe network overlaid on the 5×5 board: the cards themselves are the containers.
Water pours in from an inlet and creeps up **only while a spymaster is thinking**,
freezing during active guessing. Each player locks a single guess for which card
fills first; somewhere across the game one card tops out and lights up — or anyone
hits **Reveal** to fast-forward to the finish.

Physics is a real (quasi-static) hydraulic network, not a cartoon — gravity,
pressure-driven flow, and volume conservation are honoured. No physics library.

## Context

- **Peer layer** (`src/multiplayer/`): one `DataConnection` carries a small set of
  frames (`src/multiplayer/Session.ts`): `Action` (applied to the `Game`),
  `Presence`/`TeamClaim` (applied to the `Room`), `Ping` (keepalive). The `Host`
  owns the authoritative `Game`/`Room` and broadcasts `RoomView` to guests; a
  `Guest` sends frames and renders the `RoomView` it gets back.
- **Game state** (`src/Game.ts`): `GameState` is a plain serialisable object,
  broadcast in `RoomView` and persisted to `sessionStorage` per room
  (`src/App.tsx`, `hostStateKey`). A resuming/taking-over host inherits it via
  `Host.resume`. `Game.awaitingRole()` returns `'spymaster'` during the clue phase
  and `'operatives'` during guessing.
- **UI** (`src/ui/GameScreen.tsx`): computes `acting = game.awaitingRole()` and
  `activeSpymaster = mySeat === turn`. The board renders inside
  `<div className={styles.boardArea}>` — the overlay anchor. `App` passes callbacks
  down (e.g. `onAction` → `session.dispatch`).
- Related parked idea: the ephemeral shared doodle
  (`2026-07-06-waiting-room-doodle-design.md`). This race is **not** ephemeral —
  it is game-scoped persistent state, so it lives with `GameState`, not on a
  throwaway relay frame.

## Design

### 1. The hydraulic model — `src/water/` (new, framework-free)

A pure, deterministic solver, no React, no libs.

- **Containers = cards.** All 25 cards are identical tanks (same cross-sectional
  area and height). A card's base elevation comes from its board row, so gravity
  points down the screen. Uniform tanks keep the trick in the topology, not sizes.
- **Pipes = edges** between two cards, each with a cross-section and the heights at
  which it meets each card. Flow is bidirectional, driven by the pressure-head
  difference between the two ends: `Q = C · A · √(2 g Δh)` (Torricelli), signed by
  which side has the higher head.
- **Inlet:** a constant volumetric inflow into one top-row card (chosen at
  generation).
- **Leaks:** a "hole" is an orifice to ground; it drains per Torricelli from the
  hole's height. **Cut pipes** carry zero flow.
- **Integration:** explicit fixed-step (`dV/dt = Σ Q_in − Σ Q_out` per card),
  quasi-static (pipes pass flow instantaneously for the current heads; no fluid
  inertia / water-hammer / free-surface). Uses only `+ − × ÷ √`, so every peer
  computes bit-identical results. **The generator avoids the near-equilibrium
  (communicating-vessels) regime** (see §2), which is both the numerically stiff
  case and the ambiguous-answer case — dodging it once solves both.
- **Determinism contract:** given `(network config, elapsed sim-time)` the solver
  returns the exact water level of every card. This is what lets clients render
  locally from a shared clock (§4) instead of streaming levels.

### 2. Generation — generate-and-test

The **host** generates the puzzle once per game (on `newGame`):

1. Randomly place pipes / cuts / leaks / inlet over the fixed grid.
2. Run the solver to completion.
3. **Accept only if** exactly one card reaches full first with a comfortable time
   margin over the runner-up (crisp answer), and the config never entered the
   stiff near-equilibrium regime. Bonus preference: the winner is *not* the most
   obvious nearest card (a real trick). Otherwise reshuffle.
4. Calibrate the inflow rate so the winner tops out around the **average total
   waiting time** of a match (a tuning constant; exactness isn't possible since
   real wait time varies).

The accepted config and the authoritative winner index are stored in game state.

### 3. State shape — extend `GameState` (`src/Game.ts`)

Add one optional field, `waterRace`, holding the game-scoped race:

- `network` — the accepted pipe/card/inlet/leak config (static for the game).
- `guesses` — `Record<peerId, cardIndex>`, each player's single locked guess.
- `clock` — the shared wait-stopwatch: `{ running: boolean; accumulatedMs: number;
  since: number }` (`since` = host wall-clock when the current run/pause segment
  began). Elapsed sim-time while running = `accumulatedMs + (now − since)`.
- `revealed` — boolean; set when anyone triggers Reveal (fast-forward to end).
- `winner` — the authoritative winning card index (from generation), used as the
  backstop even if a client's local render drifts.

Because it lives in `GameState`, it serialises in `RoomView`, persists to
`sessionStorage`, and survives reload / FIFO host-takeover with no new plumbing.

New `Action`s routed through `Host.apply` (`src/multiplayer/Host.ts`):

- `{ type: 'guessWater'; cardIndex }` — lock the sender's guess (ignored once the
  race has a winner shown).
- `{ type: 'revealWater' }` — set `revealed`.

The **clock is driven by the host**, not by an action: when `awaitingRole()`
flips to `'spymaster'` the host sets `running: true`; when it flips to
`'operatives'` (a clue was given) it folds elapsed time into `accumulatedMs` and
sets `running: false`. Each flip is one `RoomView` broadcast — low frequency,
piggybacking the turn changes that already broadcast.

### 4. Sync — sync time, not water

The heavy per-frame data (water levels) is **never** sent. Each client runs the
deterministic solver locally up to the shared elapsed sim-time and renders the
levels itself. The wire only carries the static `network`, the `guesses`, the
`clock` anchor, and the `revealed`/`winner` flags — all inside `RoomView`, all
changing only on guesses / phase flips / reveal. Clients extrapolate the clock
between broadcasts (`running` → keep counting from `since`).

`Reveal` sets `revealed`; clients then advance their local sim to completion over
a short animation regardless of the wait clock. The host's stored `winner` is the
source of truth for who was right.

### 5. Overlay & interaction — `src/ui/WaterRace.tsx` (+ `.module.css`)

Mounted in `GameScreen` over `.boardArea`, **active only when**
`acting === 'spymaster' && !activeSpymaster`.

- **Pipes**: an SVG layer drawn over the grid from `network`.
- **Water**: each card shows its current fill (a rising level clipped to the card),
  recomputed each animation frame from the local solver at the shared elapsed time.
  The winning card lights up when it tops out.
- **Guess**: tapping a card sends `guessWater`; every player's guess shows as a
  marker on its card (whose is whose via peer identity). A player may re-tap to
  move their guess until the race resolves (a card fills, or someone reveals);
  after that it's read-only.
- **Reveal**: a button (any spectator) sends `revealWater`; the animation
  fast-forwards to the finish and shows who guessed right.
- The acting spymaster mounts nothing — clean board — while the host's clock keeps
  advancing underneath.

### 6. Calibration constant

A single tunable (target average fill time vs. accumulated wait) lives with the
generator. Start from an estimate of average match waiting time and adjust by feel.

## Testing

None — matching the parked doodle. (Revisit only if the solver's determinism
across peers ever needs a guard.)

## Out of scope (YAGNI)

- Any Skribbl-style rules, chat, or scoring beyond "who guessed the winner".
- Varied tank sizes, one-way valves, pumps, multiple inlets.
- True communicating-vessels equilibrium, fluid inertia, water-hammer, sloshing,
  turbulence, or any CFD/free-surface simulation.
- Restarting the race mid-game or running several races per match — one race per
  game.
- Streaming water levels over the wire — levels are always recomputed locally from
  the deterministic solver.
- Perfectly persisting an in-flight race across a host takeover beyond what
  storing `waterRace` in `GameState` already gives for free.
