# Waiting-room shared doodle (Skribbl-lite MVP)

## Goal

Give the operatives something to do while the spymaster composes a clue. During
the clue phase, everyone **except the acting spymaster** can scribble on a single
shared canvas overlaid on the board — pure pastime, no words, no guessing, no
score. The doodles clear the instant the clue lands.

This is the "shared canvas, no rules" MVP of the Skribbl idea: reuse the existing
peer channel to broadcast pen strokes; add no game rules.

## Context

- The peer layer uses a small set of wire frames on one `DataConnection`
  (`src/multiplayer/Session.ts`): `Action` (applied to the `Game`), `Presence` /
  `TeamClaim` (applied to the `Room`), and `Ping` (keepalive). Guests send frames
  to the host; the host applies them and broadcasts the authoritative `RoomView`.
- `Host` (`src/multiplayer/Host.ts`) routes each incoming frame in
  `connection.on('data')`: Ping → ignore, Presence/TeamClaim → Room, else →
  `Game`. It broadcasts `RoomView` to every guest. `Guest`
  (`src/multiplayer/Guest.ts`) sends frames and renders the `RoomView` it gets
  back.
- `GameScreen` (`src/ui/GameScreen.tsx`) computes:
  - `acting = props.game.awaitingRole()` — `'spymaster'` during the clue phase,
    `'operatives'` during guessing.
  - `activeSpymaster = props.mySeat === turn` — am I the spymaster whose turn it
    is right now.
  - The board is rendered inside `<div className={styles.boardArea}>` — the anchor
    for a positioned overlay.
- `App` (`src/App.tsx`) holds the live `Session` in `sessionRef` and passes
  callbacks down to `GameScreen` (e.g. `onAction` → `session.dispatch`).
- Tests are Playwright E2E through the `GamePage` POM, role-based locators, driven
  as a user. No unit tests today.

## Design

### 1. Wire frame — `src/multiplayer/Session.ts`

Add an **ephemeral, relayed** frame alongside `Ping`/`Presence`/`TeamClaim`:

```ts
export type Stroke = {
  __draw: true
  strokeId: string        // unique per pen-down, groups a polyline
  points: { x: number; y: number }[]  // normalised 0..1 over the board area
}
```

Points are streamed in small batches as the pen moves, so a stroke appears live
on other screens rather than only when the pen lifts. Coordinates are normalised
to the board area so a doodle lands in the same place across phone/desktop sizes.

Extend `Session` with:

```ts
sendDraw: (stroke: Stroke) => void
onDraw: (listener: (stroke: Stroke) => void) => void
```

`onDraw` registers a session-lifetime listener (same shape as `subscribe`), so
the overlay can attach its imperative renderer without a full React re-render per
point.

### 2. Relay path — `Host` and `Guest`

`Stroke` is **never applied to `Game` or `Room`** — it is relayed and rendered:

- **Guest.sendDraw** → `connection.send(stroke)`. On receiving a `Stroke`, notify
  the local `onDraw` listeners.
- **Host**: in `connection.on('data')`, add a branch before the Action fallback —
  `if ((data as Stroke).__draw)`: **relay to every other open connection** and
  notify the host's own `onDraw` listeners; do not touch `Game`/`Room` and do not
  broadcast a `RoomView`. `Host.sendDraw` (the host is a player too) relays to all
  guests and notifies local listeners.

This keeps the authoritative state clean: strokes never enter `GameState`,
`RoomView`, sessionStorage, or resume — they are transient fan-out only.

### 3. Overlay component — `src/ui/DrawLayer.tsx` (+ `DrawLayer.module.css`)

A `<canvas>` absolutely positioned to fill `.boardArea`, mounted inside
`GameScreen` next to `<Board>`.

- **Active when** `acting === 'spymaster' && !activeSpymaster` — operatives of both
  teams and the *inactive* spymaster can draw and see each other's strokes. The
  acting spymaster never mounts an active layer, so their board stays clean.
- **Capture**: pointer events (mouse + touch) on the canvas. On pointer-down mint
  a `strokeId`; on move, buffer points and flush batches through `sendDraw`; draw
  locally as you go.
- **Render incoming**: on `onDraw`, append the batch's points to the polyline for
  its `strokeId` and stroke the new segments — done imperatively on the canvas,
  off React's render path, so high-frequency updates don't re-render the tree.
- **Colour**: one fixed pen for everyone (proposal: chalk-white with a soft dark
  shadow for contrast over red/blue/neutral/assassin cards; a single tweakable
  value).
- **Clear**: when `active` flips false (the clue lands → `acting` becomes
  `operatives`), wipe the canvas and drop buffered strokes. Each new wait starts
  blank. No manual clear, no undo.

`GameScreen` gains the wiring from `App`: an `onSendDraw` callback
(`sessionRef.current?.sendDraw`) and access to the session's `onDraw`
subscription, passed to `DrawLayer` the same way `onAction` is passed today.

### 4. Coordinates

The canvas measures `.boardArea`'s current size; capture divides by that size to
normalise to 0..1, render multiplies back up. So the same normalised stroke maps
onto every peer's board regardless of screen dimensions.

## Testing

- **Visibility (Playwright, as a user)**: in a room mid-clue-phase, assert the
  doodle canvas is present for an operative and **absent** for the acting
  spymaster, and that it disappears once the clue is given. The canvas carries an
  accessible name (e.g. `getByRole` on a labelled region) so it can be located
  without test-ids.
- **Relay (Session/Host level)**: a focused test that a `Host` receiving a
  `Stroke` from one connection relays it to every *other* connection and to its
  local `onDraw` listeners, and leaves `Game`/`RoomView` untouched (no broadcast).
  Drawing pixels onto a `<canvas>` is opaque to UI assertions, so stroke fidelity
  is verified at the relay boundary, not by reading canvas pixels.

## Out of scope (YAGNI)

- Words to draw, guessing, chat, turns, scoring, leaderboard — the whole Skribbl
  rule loop. This is a bare shared canvas.
- Per-player or per-team colours, colour picker, brush sizes, eraser, undo, manual
  clear.
- Persisting or replaying doodles; showing them after the clue or at game end.
- Drawing during the guessing phase (operatives are busy clicking cards then).
- Robust handling of a host migration mid-stroke — a rare edge; a dropped stroke
  is harmless since the buffer clears next wait anyway.
