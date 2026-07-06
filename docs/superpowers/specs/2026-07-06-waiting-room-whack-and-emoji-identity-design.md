# Player emoji identity + waiting-room whack-a-card

## Goal

Two things, one on top of the other:

1. **Emoji identity (foundation).** Every player gets a distinct emoji on arrival
   (🦊, 🐸, 🦉…). It becomes the player's **canonical identity** across the UI and
   every intermission mini-game — shown prominently so you can tell who's who. It
   stays put when you switch teams, and `peerId` is sealed away as a pure transport
   detail underneath.

2. **Whack-a-card (the first game to use it).** While the acting spymaster composes
   a clue, everyone else plays an all-vs-all reflex race on the board: cards light
   up at random, **first to tap a lit card claims it** for a point, and a live
   emoji leaderboard shows who's winning. The clue lands → tally, crown the winner,
   next wait a new race.

## Context

- **Identity today:** there is none. Players are `peerId` strings; the `Room`
  (`src/multiplayer/Room.ts`) keys `teamOf`/`seatOf` by `peerId`; the UI shows
  operatives as an anonymous emoji cluster (`src/ui/GameScreen.tsx:179`,
  `<span key={i}>`) and only counts them. `peerId` is the WebRTC address: PeerJS
  routes by it (`connection.peer`), and `tabPeerId()` reuses it so a reconnecting
  tab reclaims its identity. It must stay unique and stable — an emoji cannot
  replace it at the transport level.
- **Peer layer:** guests send frames to the host on one `DataConnection`
  (`src/multiplayer/Session.ts`): `Action` → `Game`, `Presence`/`TeamClaim` →
  `Room`, `Ping` keepalive. The `Host` (`src/multiplayer/Host.ts`) owns the
  authoritative `Game`/`Room` and broadcasts `RoomView` (which carries `GameState`,
  `seats`, `teams`, `peers`). Only `GameState` is persisted to `sessionStorage`
  (`src/App.tsx`, `hostStateKey`); `Room` is rebuilt from live connections.
- **Phase:** `Game.awaitingRole()` (`src/Game.ts`) is `'spymaster'` during the clue
  phase and `'operatives'` during guessing. The acting spymaster of the current
  `turn` is `seats[turn]`.
- The board renders inside `<div className={styles.boardArea}>` in `GameScreen` —
  the overlay anchor, shared with the parked doodle/water-race specs.
- Related parked ideas: `2026-07-06-waiting-room-doodle-design.md`,
  `2026-07-06-waiting-room-water-race-design.md`.

## Design

### Part 1 — Emoji identity

**The model:** the emoji is the domain/UI identity; `peerId ↔ emoji` is a 1:1 map
the host owns; `peerId` stays private to the multiplayer layer. We do **not**
re-key `Room`/`Host`/`Guest` off `peerId` — they are peerId-native for good reason
(it is the network address). Everything player-facing (UI, mini-games, new domain
code) speaks emoji; the transport keeps speaking `peerId`, mapping at the boundary.

- **Palette:** a fixed list of ~50 visually distinct emoji (animals/faces),
  co-located with the assignment logic (a genuine shared reference, so a named
  list is warranted). It must be much larger than the max realistic player count —
  since the emoji is an id, two players can never share one.
- **Assignment — `src/multiplayer/Room.ts`:** add `emojiOf: Record<peerId, string>`
  as a third immutable field (same style as `teamOf`/`seatOf`, returns a new
  `Room`). On arrival the host assigns the first palette emoji **not currently in
  use** (host already calls `assignTeam` on connect in `Host.run`; assign the emoji
  in the same place). `drop()` releases it back to the palette. Uniqueness is by
  construction (pick an unused one).
- **Stability:** keyed by `peerId`, independent of team → survives `setTeam`
  automatically. Within a host's life it never changes.
- **Broadcast:** add `emojis: Record<peerId, string>` to `RoomView`
  (`src/multiplayer/Session.ts`) and to `Host.view()`. Guests just render it. It
  changes only on join/leave — cheap.
- **Display — `src/ui/GameScreen.tsx`:** replace the anonymous operative cluster
  with each operative's assigned emoji, rendered prominently (larger), so a team
  slot shows *who* is on it, not just a headcount. This improves the base game for
  free. Self is highlighted (e.g. a ring) so you can find yourself.
- **Known limitation:** on a FIFO host takeover the `Room` (and its `emojiOf`) is
  rebuilt from reconnections, so emojis may be reassigned. Rare and harmless;
  persisting the map across takeover is out of scope.

### Part 2 — Whack-a-card

An ephemeral, host-driven, all-vs-all race. It never touches `Game`/`Room` state
and is **not** bundled into `RoomView` (which carries the whole board — too heavy
to resend every tick); it rides its own lightweight broadcast.

**Lifecycle (host-owned):**
- The host runs a round **only while `awaitingRole() === 'spymaster'`**. It starts
  the round on entering a clue phase and ends it when a clue is given (phase →
  `'operatives'`), hooking the transition in `Host.dispatch`/`apply`.
- **Eligible players** = everyone except the acting spymaster (`seats[turn]`).
  Degrades gracefully: with one waiting player it is a solo warm-up; the fun needs
  2+, but nothing breaks.

**Moles (host-authoritative, identical for all):**
- A spawn timer lights cards at random over the wait — each mole is a
  `{ cardIndex, until }` (a short live window). The host owns the schedule so every
  screen sees the same cards light at the same moments (fairness).
- **First-to-tap claims.** A tap arrives as `{ __whackTap: true; cardIndex }`
  (guest → host, or the host's own tap locally). The host checks the card is a live
  unclaimed mole; if so it awards **+1 to the tapper's emoji**, marks the mole
  claimed (it goes dark), and broadcasts. First tap *to reach the host* wins — the
  host is the single arbiter, so there is no disagreement about who was first.
- Tapping a dark card does nothing (no penalty, MVP).

**Broadcast — new ephemeral frames in `Session.ts` (never applied to
`Game`/`Room`):**
- `WhackState` (host → all): `{ __whack: true; moles: {cardIndex, until}[];
  scores: {emoji, points}[]; winner?: string }` — sent on each spawn / claim / end.
- `WhackTap` (guest → host): `{ __whackTap: true; cardIndex }`.
- `Session` gains `whackTap(cardIndex)` and `onWhack(listener)`. `Host` handles
  `__whackTap` in `connection.on('data')` (a branch before the `Action` fallback)
  and drives the spawn timer + broadcasts `WhackState`; `Guest.whackTap` sends the
  frame and its `onWhack` fires on inbound `WhackState`.

**Overlay & interaction — `src/ui/WhackGame.tsx` (+ `.module.css`):**
- Mounted over `.boardArea`, active only when
  `acting === 'spymaster' && !activeSpymaster`.
- Lit cards get a "mole" treatment (glow / target) over the real card; tapping one
  sends `whackTap`. During the clue phase operatives don't click cards for the real
  game, so taps are unambiguous.
- **Leaderboard:** the emoji identities with live scores, sorted, self highlighted
  (`🦊 12 · 🐸 9 · 🦉 7`).
- **End:** when the clue lands, the final `WhackState` carries `winner`; show a brief
  crowning of that emoji, then the board returns to guessing. Nothing persists.
- The acting spymaster mounts nothing — clean board.

**Round logic — `src/whack/` (framework-free):** the spawn schedule and scoring
live in a small pure module the host uses, separate from the React overlay, so the
timing/claim rules are testable in isolation from rendering.

## Testing

None by default, matching the other intermission specs. The one piece of real
logic worth a focused unit test *if* reliability ever bites: emoji assignment
(distinct emoji per peer, released on `drop`, stable across `setTeam`). Left out
for now.

## Out of scope (YAGNI)

- Typed names / nicknames, avatar pictures, letting players pick their emoji.
- Re-keying `Room`/`Host`/`Guest` off emoji — `peerId` stays the transport id.
- Persisting the emoji map across a host takeover.
- Whack scoring across rounds, a session leaderboard, streaks, or misclick
  penalties — each race is self-contained and forgotten.
- Parallel scoring (everyone taps every mole) — decided against; first-to-tap wins.
- Putting whack or emoji-identity churn into `GameState` — identity lives in `Room`,
  the race rides its own ephemeral broadcast; neither pollutes the persisted game.
