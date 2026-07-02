# Codenames Pictures MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a peer-to-peer *Codenames Pictures* web game where two browser tabs connect directly, share an identical 20-photo board, and reveal card colors to each other live.

**Architecture:** Static Vite + React app, no backend. Pure game logic (`game/`) is host-authoritative and fully unit-tested. WebRTC via PeerJS (free public broker) connects peers; the host holds the single `GameState` and broadcasts it to clients on every change. Card photos come from the Unsplash API, fetched by the host and embedded in state so all peers render identical cards.

**Tech Stack:** Vite, React, TypeScript, PeerJS, Vitest + React Testing Library, Unsplash API.

## Global Constraints

- MVP anti-cheat is **honor-system**: host broadcasts full `GameState` (including the secret key) to every peer; the "Spymaster view" toggle only controls local rendering. No `viewFor` filtering in the MVP.
- The host validates actions by **game phase legality only** (clue during clue phase, guess during guess phase), not by which peer sent them. Casual play; turn ownership is not enforced per-peer.
- Board is always **20 cards** in a **5×4 grid**. Key distribution: **8** starting team, **7** other team, **4** neutral, **1** assassin.
- Unsplash access key is read from `import.meta.env.VITE_UNSPLASH_ACCESS_KEY` (build-time public env var).
- Prefer role-based locators (`getByRole`, `findByRole`, `getByLabelText`) in UI tests. No mocks in game-logic tests.
- **No technical-hotspot modules.** Do not create `types`, `utils`, `helpers`, `constants`, or `hooks` files (an ESLint `no-restricted-imports` rule bans importing them). Types, constants, and helpers live with the code that owns them. In this project: game-state types (`GameState`, `Card`, `Clue`, `Team`, `CardColor`, `GamePhase`) live in `createGame.ts`; `Action` lives in `applyAction.ts`.

---

## File Structure

```
index.html
package.json
vite.config.ts
.env.local                  # VITE_UNSPLASH_ACCESS_KEY=... (gitignored)
src/
  main.tsx                  # React entry
  App.tsx                   # screen state machine + net/game wiring
  game/
    types.ts                # GameState, Card, Action, Team, CardColor
    createGame.ts           # createGame(images, startingTeam)
    applyAction.ts          # applyAction(state, action) reducer
    game.test.ts            # unit tests for createGame + applyAction
  net/
    peer.ts                 # createHost() / createClient() PeerJS wrappers
  images/
    unsplash.ts             # fetchImages() -> string[]
  ui/
    Lobby.tsx               # create/join screen
    Lobby.test.tsx
    Board.tsx               # 5x4 grid of picture cards
    Board.test.tsx
    ClueBar.tsx             # turn indicator + clue input / end-turn
    GameOver.tsx            # winner banner
```

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `.gitignore` (already exists — verify), `.env.local`
- Test: `src/smoke.test.ts`

**Interfaces:**
- Produces: a runnable Vite dev server and a passing Vitest run. No exported symbols.

- [ ] **Step 1: Scaffold and install dependencies**

Run:
```bash
npm create vite@latest . -- --template react-ts
npm install
npm install peerjs
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```
If `npm create vite` complains the directory isn't empty, choose "Ignore files and continue".

- [ ] **Step 2: Configure Vitest**

Replace `vite.config.ts` with:
```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
  },
})
```

Create `src/setupTests.ts`:
```ts
import '@testing-library/jest-dom'
```

Add to `package.json` `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Add the env file**

Create `.env.local`:
```
VITE_UNSPLASH_ACCESS_KEY=replace-with-your-unsplash-access-key
```
Confirm `.env.local` is covered by `.gitignore` (the existing `.gitignore` has `.env.local`).

- [ ] **Step 4: Write a smoke test**

Create `src/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('runs the test suite', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 5: Run the smoke test**

Run: `npm test`
Expected: PASS (1 test passed).

- [ ] **Step 6: Verify dev server boots**

Run: `npm run build`
Expected: build completes with no errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS + Vitest project"
```

---

### Task 2: Game types and createGame

**Files:**
- Create: `src/game/types.ts`, `src/game/createGame.ts`
- Test: `src/game/game.test.ts`

**Interfaces:**
- Produces:
  - `type Team = 'red' | 'blue'`
  - `type CardColor = 'red' | 'blue' | 'neutral' | 'assassin'`
  - `interface Card { imageUrl: string; color: CardColor; revealed: boolean }`
  - `interface Clue { team: Team; word: string; count: number }`
  - `type GamePhase = 'clue' | 'guess'`
  - `interface GameState { cards: Card[]; turn: Team; phase: GamePhase; clue: Clue | null; guessesRemaining: number; winner: Team | null; log: string[] }`
  - `type Action = { type: 'clue'; word: string; count: number } | { type: 'guess'; cardIndex: number } | { type: 'endTurn' }`
  - `createGame(images: string[], startingTeam: Team): GameState`

- [ ] **Step 1: Write the types**

Create `src/game/types.ts`:
```ts
export type Team = 'red' | 'blue'
export type CardColor = 'red' | 'blue' | 'neutral' | 'assassin'
export type GamePhase = 'clue' | 'guess'

export interface Card {
  imageUrl: string
  color: CardColor
  revealed: boolean
}

export interface Clue {
  team: Team
  word: string
  count: number
}

export interface GameState {
  cards: Card[]
  turn: Team
  phase: GamePhase
  clue: Clue | null
  guessesRemaining: number
  winner: Team | null
  log: string[]
}

export type Action =
  | { type: 'clue'; word: string; count: number }
  | { type: 'guess'; cardIndex: number }
  | { type: 'endTurn' }
```

- [ ] **Step 2: Write failing tests for createGame**

Create `src/game/game.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { createGame } from './createGame'
import type { CardColor } from './types'

const images = Array.from({ length: 20 }, (_, i) => `img-${i}.jpg`)

function countColor(colors: CardColor[], color: CardColor): number {
  return colors.filter((c) => c === color).length
}

describe('createGame', () => {
  it('creates 20 cards from the images', () => {
    const state = createGame(images, 'red')
    expect(state.cards).toHaveLength(20)
    expect(state.cards.map((c) => c.imageUrl).sort()).toEqual([...images].sort())
  })

  it('distributes the key as 8/7/4/1 with the starting team getting 8', () => {
    const state = createGame(images, 'red')
    const colors = state.cards.map((c) => c.color)
    expect(countColor(colors, 'red')).toBe(8)
    expect(countColor(colors, 'blue')).toBe(7)
    expect(countColor(colors, 'neutral')).toBe(4)
    expect(countColor(colors, 'assassin')).toBe(1)
  })

  it('gives the other starting team 8 when blue starts', () => {
    const state = createGame(images, 'blue')
    const colors = state.cards.map((c) => c.color)
    expect(countColor(colors, 'blue')).toBe(8)
    expect(countColor(colors, 'red')).toBe(7)
  })

  it('starts in the clue phase with the starting team to move and no winner', () => {
    const state = createGame(images, 'red')
    expect(state.turn).toBe('red')
    expect(state.phase).toBe('clue')
    expect(state.clue).toBeNull()
    expect(state.winner).toBeNull()
    expect(state.cards.every((c) => !c.revealed)).toBe(true)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- src/game/game.test.ts`
Expected: FAIL (cannot find module `./createGame`).

- [ ] **Step 4: Implement createGame**

Create `src/game/createGame.ts`:
```ts
import type { GameState, Team, Card, CardColor } from './types'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function createGame(images: string[], startingTeam: Team): GameState {
  const otherTeam: Team = startingTeam === 'red' ? 'blue' : 'red'
  const colors: CardColor[] = shuffle([
    ...Array<CardColor>(8).fill(startingTeam),
    ...Array<CardColor>(7).fill(otherTeam),
    ...Array<CardColor>(4).fill('neutral'),
    'assassin',
  ])
  const cards: Card[] = images.slice(0, 20).map((imageUrl, i) => ({
    imageUrl,
    color: colors[i],
    revealed: false,
  }))
  return {
    cards,
    turn: startingTeam,
    phase: 'clue',
    clue: null,
    guessesRemaining: 0,
    winner: null,
    log: [],
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/game/game.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/game/types.ts src/game/createGame.ts src/game/game.test.ts
git commit -m "feat: game types and createGame with 8/7/4/1 key"
```

---

### Task 3: applyAction — clue and guess flow

**Files:**
- Create: `src/game/applyAction.ts`
- Test: `src/game/game.test.ts` (append)

**Interfaces:**
- Consumes: `GameState`, `Action`, `Team`, `Card` from `./types`.
- Produces: `applyAction(state: GameState, action: Action): GameState` — pure, returns a new state.

- [ ] **Step 1: Add a test helper and clue/guess tests**

Append to `src/game/game.test.ts`:
```ts
import { applyAction } from './applyAction'
import type { GameState, Card } from './types'

function state(colors: Card['color'][], overrides: Partial<GameState> = {}): GameState {
  return {
    cards: colors.map((color, i) => ({ imageUrl: `img-${i}.jpg`, color, revealed: false })),
    turn: 'red',
    phase: 'clue',
    clue: null,
    guessesRemaining: 0,
    winner: null,
    log: [],
    ...overrides,
  }
}

describe('applyAction — clue', () => {
  it('records the clue and enters guess phase with count+1 guesses', () => {
    const s = state(['red', 'blue', 'neutral'])
    const next = applyAction(s, { type: 'clue', word: 'animal', count: 2 })
    expect(next.phase).toBe('guess')
    expect(next.clue).toEqual({ team: 'red', word: 'animal', count: 2 })
    expect(next.guessesRemaining).toBe(3)
  })

  it('ignores a clue when not in clue phase', () => {
    const s = state(['red'], { phase: 'guess' })
    const next = applyAction(s, { type: 'clue', word: 'x', count: 1 })
    expect(next).toBe(s)
  })
})

describe('applyAction — guess', () => {
  it('reveals a correct card and decrements guesses, staying in guess phase', () => {
    const s = state(['red', 'blue', 'neutral', 'blue'], { phase: 'guess', guessesRemaining: 2 })
    const next = applyAction(s, { type: 'guess', cardIndex: 0 })
    expect(next.cards[0].revealed).toBe(true)
    expect(next.guessesRemaining).toBe(1)
    expect(next.phase).toBe('guess')
    expect(next.turn).toBe('red')
  })

  it('ends the turn after guessing a neutral card', () => {
    const s = state(['red', 'neutral', 'blue', 'blue'], { phase: 'guess', guessesRemaining: 2 })
    const next = applyAction(s, { type: 'guess', cardIndex: 1 })
    expect(next.cards[1].revealed).toBe(true)
    expect(next.phase).toBe('clue')
    expect(next.turn).toBe('blue')
    expect(next.clue).toBeNull()
  })

  it('ends the turn after guessing an enemy card', () => {
    const s = state(['red', 'red', 'blue', 'neutral'], { phase: 'guess', guessesRemaining: 2 })
    const next = applyAction(s, { type: 'guess', cardIndex: 2 })
    expect(next.cards[2].revealed).toBe(true)
    expect(next.turn).toBe('blue')
    expect(next.phase).toBe('clue')
  })

  it('ends the turn when guesses run out', () => {
    const s = state(['red', 'red', 'blue', 'blue'], { phase: 'guess', guessesRemaining: 1 })
    const next = applyAction(s, { type: 'guess', cardIndex: 0 })
    expect(next.guessesRemaining).toBe(0)
    expect(next.phase).toBe('clue')
    expect(next.turn).toBe('blue')
  })

  it('ignores a guess on an already-revealed card', () => {
    const base = state(['red', 'blue'], { phase: 'guess', guessesRemaining: 2 })
    base.cards[0].revealed = true
    const next = applyAction(base, { type: 'guess', cardIndex: 0 })
    expect(next).toBe(base)
  })

  it('ignores a guess when not in guess phase', () => {
    const s = state(['red', 'blue'])
    const next = applyAction(s, { type: 'guess', cardIndex: 0 })
    expect(next).toBe(s)
  })
})

describe('applyAction — endTurn', () => {
  it('switches team and returns to clue phase', () => {
    const s = state(['red', 'blue'], { phase: 'guess', guessesRemaining: 2, clue: { team: 'red', word: 'x', count: 1 } })
    const next = applyAction(s, { type: 'endTurn' })
    expect(next.turn).toBe('blue')
    expect(next.phase).toBe('clue')
    expect(next.clue).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/game/game.test.ts`
Expected: FAIL (cannot find module `./applyAction`).

- [ ] **Step 3: Implement applyAction**

Create `src/game/applyAction.ts`:
```ts
import type { GameState, Action, Team } from './types'

const other = (t: Team): Team => (t === 'red' ? 'blue' : 'red')

const remaining = (s: GameState, team: Team): number =>
  s.cards.filter((c) => c.color === team && !c.revealed).length

export function applyAction(state: GameState, action: Action): GameState {
  if (state.winner) return state

  if (action.type === 'clue') {
    if (state.phase !== 'clue') return state
    return {
      ...state,
      phase: 'guess',
      clue: { team: state.turn, word: action.word, count: action.count },
      guessesRemaining: action.count + 1,
      log: [...state.log, `${state.turn} clue: ${action.word} ${action.count}`],
    }
  }

  if (action.type === 'endTurn') {
    return {
      ...state,
      phase: 'clue',
      clue: null,
      turn: other(state.turn),
      log: [...state.log, `${state.turn} ended their turn`],
    }
  }

  // guess
  if (state.phase !== 'guess') return state
  const card = state.cards[action.cardIndex]
  if (!card || card.revealed) return state

  const cards = state.cards.map((c, i) =>
    i === action.cardIndex ? { ...c, revealed: true } : c,
  )
  const next: GameState = {
    ...state,
    cards,
    log: [...state.log, `${state.turn} guessed ${card.color}`],
  }

  if (card.color === 'assassin') {
    return { ...next, winner: other(state.turn), phase: 'clue', clue: null }
  }
  if (remaining(next, 'red') === 0) return { ...next, winner: 'red', phase: 'clue', clue: null }
  if (remaining(next, 'blue') === 0) return { ...next, winner: 'blue', phase: 'clue', clue: null }

  if (card.color === state.turn) {
    const guessesRemaining = state.guessesRemaining - 1
    if (guessesRemaining <= 0) {
      return { ...next, guessesRemaining: 0, phase: 'clue', clue: null, turn: other(state.turn) }
    }
    return { ...next, guessesRemaining }
  }

  // neutral or enemy → turn ends
  return { ...next, phase: 'clue', clue: null, turn: other(state.turn) }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/game/game.test.ts`
Expected: PASS (all clue/guess/endTurn tests).

- [ ] **Step 5: Commit**

```bash
git add src/game/applyAction.ts src/game/game.test.ts
git commit -m "feat: applyAction clue/guess/endTurn flow with turn switching"
```

---

### Task 4: applyAction — assassin loss and team win

**Files:**
- Modify: `src/game/applyAction.ts` (already handles these — this task locks the behavior with tests)
- Test: `src/game/game.test.ts` (append)

**Interfaces:**
- Consumes: `applyAction` from Task 3.
- Produces: no new symbols; verified win/loss behavior.

- [ ] **Step 1: Write win/loss tests**

Append to `src/game/game.test.ts`:
```ts
describe('applyAction — win and loss', () => {
  it('makes the guessing team lose immediately on the assassin', () => {
    const s = state(['assassin', 'red', 'blue'], { phase: 'guess', guessesRemaining: 2 })
    const next = applyAction(s, { type: 'guess', cardIndex: 0 })
    expect(next.winner).toBe('blue')
    expect(next.phase).toBe('clue')
  })

  it('wins when a team reveals its last own card', () => {
    // one red card left; red guesses it
    const s = state(['red', 'blue', 'neutral'], { phase: 'guess', guessesRemaining: 2 })
    const next = applyAction(s, { type: 'guess', cardIndex: 0 })
    expect(next.winner).toBe('red')
  })

  it('lets the enemy win if you reveal their last card', () => {
    // one blue card left; red guesses it and hands blue the win
    const s = state(['blue', 'red', 'neutral'], { phase: 'guess', guessesRemaining: 2 })
    const next = applyAction(s, { type: 'guess', cardIndex: 0 })
    expect(next.winner).toBe('blue')
  })

  it('ignores actions once there is a winner', () => {
    const s = state(['red', 'blue'], { winner: 'red' })
    const next = applyAction(s, { type: 'guess', cardIndex: 1 })
    expect(next).toBe(s)
  })
})
```

- [ ] **Step 2: Run tests**

Run: `npm test -- src/game/game.test.ts`
Expected: PASS (win/loss tests pass against the Task 3 implementation).

- [ ] **Step 3: Commit**

```bash
git add src/game/game.test.ts
git commit -m "test: lock assassin loss and team win detection"
```

---

### Task 5: Unsplash image fetching

**Files:**
- Create: `src/images/unsplash.ts`

**Interfaces:**
- Produces: `fetchImages(): Promise<string[]>` — returns 20 image URL strings.

- [ ] **Step 1: Implement fetchImages**

Create `src/images/unsplash.ts`:
```ts
interface UnsplashPhoto {
  urls: { small: string; regular: string }
}

export async function fetchImages(): Promise<string[]> {
  const key = import.meta.env.VITE_UNSPLASH_ACCESS_KEY
  const res = await fetch(
    `https://api.unsplash.com/photos/random?count=20&client_id=${key}`,
  )
  if (!res.ok) {
    throw new Error(`Unsplash request failed: ${res.status}`)
  }
  const photos = (await res.json()) as UnsplashPhoto[]
  return photos.map((p) => p.urls.small)
}
```

- [ ] **Step 2: Manual verification**

This calls a live external API, so verify manually (no unit test — avoids mocking the network). After Task 9 wires it in, creating a room should populate the board with 20 real photos. If you want an isolated check now, temporarily add a button in `App.tsx` that calls `fetchImages().then(console.log)` and confirm 20 URLs log; remove it after.

- [ ] **Step 3: Commit**

```bash
git add src/images/unsplash.ts
git commit -m "feat: fetch 20 random photos from Unsplash"
```

---

### Task 6: PeerJS host/client wrappers

**Files:**
- Create: `src/net/peer.ts`

**Interfaces:**
- Consumes: `GameState`, `Action` from `../game/types`.
- Produces:
  - `interface Host { roomCode: string; broadcast(state: GameState): void; onAction(h: (a: Action) => void): void; onPeerCountChange(h: (n: number) => void): void }`
  - `createHost(): Promise<Host>`
  - `interface Client { send(action: Action): void; onState(h: (s: GameState) => void): void; onClose(h: () => void): void }`
  - `createClient(roomCode: string): Promise<Client>`

- [ ] **Step 1: Implement the wrappers**

Create `src/net/peer.ts`:
```ts
import Peer, { type DataConnection } from 'peerjs'
import type { Action, GameState } from '../game/types'

export interface Host {
  roomCode: string
  broadcast: (state: GameState) => void
  onAction: (handler: (action: Action) => void) => void
  onPeerCountChange: (handler: (count: number) => void) => void
}

export function createHost(): Promise<Host> {
  return new Promise((resolve, reject) => {
    const peer = new Peer()
    const conns: DataConnection[] = []
    let actionHandler: (a: Action) => void = () => {}
    let countHandler: (n: number) => void = () => {}

    peer.on('open', (id) => {
      resolve({
        roomCode: id,
        broadcast: (state) => conns.forEach((c) => c.open && c.send(state)),
        onAction: (h) => { actionHandler = h },
        onPeerCountChange: (h) => { countHandler = h },
      })
    })
    peer.on('error', reject)
    peer.on('connection', (conn) => {
      conn.on('open', () => { conns.push(conn); countHandler(conns.length) })
      conn.on('data', (data) => actionHandler(data as Action))
      conn.on('close', () => {
        const i = conns.indexOf(conn)
        if (i >= 0) conns.splice(i, 1)
        countHandler(conns.length)
      })
    })
  })
}

export interface Client {
  send: (action: Action) => void
  onState: (handler: (state: GameState) => void) => void
  onClose: (handler: () => void) => void
}

export function createClient(roomCode: string): Promise<Client> {
  return new Promise((resolve, reject) => {
    const peer = new Peer()
    let stateHandler: (s: GameState) => void = () => {}
    let closeHandler: () => void = () => {}

    peer.on('open', () => {
      const conn = peer.connect(roomCode, { reliable: true })
      conn.on('open', () => {
        resolve({
          send: (action) => conn.send(action),
          onState: (h) => { stateHandler = h },
          onClose: (h) => { closeHandler = h },
        })
      })
      conn.on('data', (data) => stateHandler(data as GameState))
      conn.on('close', () => closeHandler())
    })
    peer.on('error', reject)
  })
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run build`
Expected: build succeeds (no TS errors).

- [ ] **Step 3: Commit**

```bash
git add src/net/peer.ts
git commit -m "feat: PeerJS host/client wrappers over free broker"
```

---

### Task 7: Board component

**Files:**
- Create: `src/ui/Board.tsx`
- Test: `src/ui/Board.test.tsx`

**Interfaces:**
- Consumes: `Card` from `../game/types`.
- Produces: `Board(props: { cards: Card[]; spymaster: boolean; onCardClick: (index: number) => void })` — default export React component. Each card is a `button` with accessible name `Card {n}`; revealed cards and (when `spymaster`) all cards carry a `data-color` attribute equal to the card's color.

- [ ] **Step 1: Write failing tests**

Create `src/ui/Board.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Board from './Board'
import type { Card } from '../game/types'

const cards: Card[] = Array.from({ length: 20 }, (_, i) => ({
  imageUrl: `img-${i}.jpg`,
  color: i === 0 ? 'red' : 'neutral',
  revealed: false,
}))

describe('Board', () => {
  it('renders 20 card buttons', () => {
    render(<Board cards={cards} spymaster={false} onCardClick={() => {}} />)
    expect(screen.getAllByRole('button')).toHaveLength(20)
  })

  it('calls onCardClick with the card index when clicked', async () => {
    const onCardClick = vi.fn()
    render(<Board cards={cards} spymaster={false} onCardClick={onCardClick} />)
    await userEvent.click(screen.getByRole('button', { name: 'Card 1' }))
    expect(onCardClick).toHaveBeenCalledWith(0)
  })

  it('exposes colors to a spymaster even before reveal', () => {
    render(<Board cards={cards} spymaster={true} onCardClick={() => {}} />)
    expect(screen.getByRole('button', { name: 'Card 1' })).toHaveAttribute('data-color', 'red')
  })

  it('hides unrevealed colors from operatives', () => {
    render(<Board cards={cards} spymaster={false} onCardClick={() => {}} />)
    expect(screen.getByRole('button', { name: 'Card 1' })).not.toHaveAttribute('data-color')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/ui/Board.test.tsx`
Expected: FAIL (cannot find module `./Board`).

- [ ] **Step 3: Implement Board**

Create `src/ui/Board.tsx`:
```tsx
import type { Card } from '../game/types'

interface BoardProps {
  cards: Card[]
  spymaster: boolean
  onCardClick: (index: number) => void
}

export default function Board({ cards, spymaster, onCardClick }: BoardProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 8,
        maxWidth: 900,
      }}
    >
      {cards.map((card, i) => {
        const showColor = card.revealed || spymaster
        return (
          <button
            key={i}
            aria-label={`Card ${i + 1}`}
            data-color={showColor ? card.color : undefined}
            onClick={() => onCardClick(i)}
            disabled={card.revealed}
            style={{
              position: 'relative',
              aspectRatio: '4 / 3',
              padding: 0,
              border: showColor ? `4px solid ${colorHex(card.color)}` : '4px solid transparent',
              borderRadius: 8,
              overflow: 'hidden',
              cursor: card.revealed ? 'default' : 'pointer',
              opacity: card.revealed ? 0.55 : 1,
            }}
          >
            <img
              src={card.imageUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </button>
        )
      })}
    </div>
  )
}

function colorHex(color: Card['color']): string {
  switch (color) {
    case 'red': return '#d33'
    case 'blue': return '#36c'
    case 'assassin': return '#111'
    default: return '#caa'
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/ui/Board.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ui/Board.tsx src/ui/Board.test.tsx
git commit -m "feat: Board component with spymaster color overlay"
```

---

### Task 8: Lobby component

**Files:**
- Create: `src/ui/Lobby.tsx`
- Test: `src/ui/Lobby.test.tsx`

**Interfaces:**
- Produces: `Lobby(props: { status: string; onCreate: () => void; onJoin: (code: string) => void })` — default export. Renders a "Create room" button, a textbox labelled "Room code", a "Join" button, and the `status` text.

- [ ] **Step 1: Write failing tests**

Create `src/ui/Lobby.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Lobby from './Lobby'

describe('Lobby', () => {
  it('calls onCreate when Create room is clicked', async () => {
    const onCreate = vi.fn()
    render(<Lobby status="" onCreate={onCreate} onJoin={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /create room/i }))
    expect(onCreate).toHaveBeenCalled()
  })

  it('calls onJoin with the entered code', async () => {
    const onJoin = vi.fn()
    render(<Lobby status="" onCreate={() => {}} onJoin={onJoin} />)
    await userEvent.type(screen.getByLabelText(/room code/i), 'abc123')
    await userEvent.click(screen.getByRole('button', { name: /^join$/i }))
    expect(onJoin).toHaveBeenCalledWith('abc123')
  })

  it('shows the status text', () => {
    render(<Lobby status="Connecting…" onCreate={() => {}} onJoin={() => {}} />)
    expect(screen.getByText('Connecting…')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/ui/Lobby.test.tsx`
Expected: FAIL (cannot find module `./Lobby`).

- [ ] **Step 3: Implement Lobby**

Create `src/ui/Lobby.tsx`:
```tsx
import { useState } from 'react'

interface LobbyProps {
  status: string
  onCreate: () => void
  onJoin: (code: string) => void
}

export default function Lobby({ status, onCreate, onJoin }: LobbyProps) {
  const [code, setCode] = useState('')
  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 360 }}>
      <h1>Codenames Pictures</h1>
      <button onClick={onCreate}>Create room</button>
      <div style={{ display: 'flex', gap: 8 }}>
        <label htmlFor="room-code">Room code</label>
        <input
          id="room-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button onClick={() => onJoin(code)}>Join</button>
      </div>
      {status && <p>{status}</p>}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/ui/Lobby.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ui/Lobby.tsx src/ui/Lobby.test.tsx
git commit -m "feat: Lobby with create/join"
```

---

### Task 9: ClueBar, GameOver, and App wiring

**Files:**
- Create: `src/ui/ClueBar.tsx`, `src/ui/GameOver.tsx`
- Modify: `src/App.tsx`, `src/main.tsx` (ensure it renders `<App />`)
- Test: manual (two-tab integration)

**Interfaces:**
- Consumes: `createGame`, `applyAction`, `GameState`, `Action`, `Team` from `game/`; `createHost`, `createClient`, `Host`, `Client` from `net/peer`; `fetchImages` from `images/unsplash`; `Board`, `Lobby` components.
- Produces: `ClueBar(props: { state: GameState; onClue: (word: string, count: number) => void; onEndTurn: () => void })`, `GameOver(props: { winner: Team })`, and a wired `App` default export.

- [ ] **Step 1: Implement ClueBar**

Create `src/ui/ClueBar.tsx`:
```tsx
import { useState } from 'react'
import type { GameState } from '../game/types'

interface ClueBarProps {
  state: GameState
  onClue: (word: string, count: number) => void
  onEndTurn: () => void
}

export default function ClueBar({ state, onClue, onEndTurn }: ClueBarProps) {
  const [word, setWord] = useState('')
  const [count, setCount] = useState(1)

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '12px 0' }}>
      <strong style={{ color: state.turn === 'red' ? '#d33' : '#36c' }}>
        {state.turn.toUpperCase()}'s turn
      </strong>
      {state.phase === 'clue' ? (
        <>
          <label htmlFor="clue-word">Clue</label>
          <input id="clue-word" value={word} onChange={(e) => setWord(e.target.value)} />
          <label htmlFor="clue-count">Number</label>
          <input
            id="clue-count"
            type="number"
            min={0}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
          <button onClick={() => { if (word.trim()) { onClue(word.trim(), count); setWord('') } }}>
            Give clue
          </button>
        </>
      ) : (
        <>
          <span>
            Clue: <strong>{state.clue?.word}</strong> {state.clue?.count} · {state.guessesRemaining} guesses left
          </span>
          <button onClick={onEndTurn}>End turn</button>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Implement GameOver**

Create `src/ui/GameOver.tsx`:
```tsx
import type { Team } from '../game/types'

export default function GameOver({ winner }: { winner: Team }) {
  return (
    <div role="status" style={{ fontSize: 24, margin: '12px 0', color: winner === 'red' ? '#d33' : '#36c' }}>
      {winner.toUpperCase()} wins! Reload to play again.
    </div>
  )
}
```

- [ ] **Step 3: Wire App**

Replace `src/App.tsx` with:
```tsx
import { useCallback, useRef, useState } from 'react'
import type { Action, GameState } from './game/types'
import { createGame } from './game/createGame'
import { applyAction } from './game/applyAction'
import { fetchImages } from './images/unsplash'
import { createHost, createClient, type Host, type Client } from './net/peer'
import Lobby from './ui/Lobby'
import Board from './ui/Board'
import ClueBar from './ui/ClueBar'
import GameOver from './ui/GameOver'

export default function App() {
  const [state, setState] = useState<GameState | null>(null)
  const [status, setStatus] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [spymaster, setSpymaster] = useState(false)
  const hostRef = useRef<Host | null>(null)
  const clientRef = useRef<Client | null>(null)

  // Host applies actions authoritatively and rebroadcasts.
  const handleHostAction = useCallback((action: Action) => {
    setState((prev) => {
      if (!prev) return prev
      const next = applyAction(prev, action)
      hostRef.current?.broadcast(next)
      return next
    })
  }, [])

  const dispatch = useCallback((action: Action) => {
    if (hostRef.current) {
      handleHostAction(action)
    } else {
      clientRef.current?.send(action)
    }
  }, [handleHostAction])

  const onCreate = useCallback(async () => {
    setStatus('Creating room…')
    const host = await createHost()
    hostRef.current = host
    setRoomCode(host.roomCode)
    host.onAction(handleHostAction)
    setStatus('Fetching images…')
    const images = await fetchImages()
    const initial = createGame(images, Math.random() < 0.5 ? 'red' : 'blue')
    setState(initial)
    host.onPeerCountChange(() => host.broadcast(initial))
    host.broadcast(initial)
    setStatus('')
  }, [handleHostAction])

  const onJoin = useCallback(async (code: string) => {
    setStatus('Connecting…')
    try {
      const client = await createClient(code)
      clientRef.current = client
      client.onState((s) => setState(s))
      client.onClose(() => setStatus('Host left — game over.'))
      setStatus('Connected. Waiting for board…')
    } catch {
      setStatus('Could not connect. Check the room code.')
    }
  }, [])

  if (!state) {
    return <Lobby status={status} onCreate={onCreate} onJoin={onJoin} />
  }

  return (
    <div style={{ padding: 16 }}>
      {roomCode && <p>Room code: <code>{roomCode}</code> (share this)</p>}
      <label>
        <input type="checkbox" checked={spymaster} onChange={(e) => setSpymaster(e.target.checked)} />
        {' '}Spymaster view
      </label>
      {state.winner && <GameOver winner={state.winner} />}
      {!state.winner && (
        <ClueBar
          state={state}
          onClue={(word, count) => dispatch({ type: 'clue', word, count })}
          onEndTurn={() => dispatch({ type: 'endTurn' })}
        />
      )}
      <Board
        cards={state.cards}
        spymaster={spymaster}
        onCardClick={(cardIndex) => dispatch({ type: 'guess', cardIndex })}
      />
    </div>
  )
}
```

- [ ] **Step 4: Ensure main.tsx renders App**

Confirm `src/main.tsx` renders `<App />` (the Vite template does; remove any leftover demo CSS import that errors). Run:
```bash
npm run build
```
Expected: build succeeds.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS (game + Board + Lobby tests all green).

- [ ] **Step 6: Manual two-tab verification**

1. Put a real key in `.env.local` (`VITE_UNSPLASH_ACCESS_KEY=...`).
2. Run `npm run dev`. Open the URL in **two** browser tabs.
3. Tab A: click **Create room** → 20 photos appear, a room code shows.
4. Tab B: paste the code → click **Join** → the same 20 photos appear.
5. Tab A: toggle **Spymaster view** → colored borders appear on all cards.
6. Give a clue in the active team's tab, then click a card → the reveal appears in **both** tabs live.
7. Reveal the assassin (use spymaster view to find it) → both tabs show the other team winning.

Expected: boards stay in sync; reveals and win/loss propagate to both tabs.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/ui/ClueBar.tsx src/ui/GameOver.tsx src/main.tsx
git commit -m "feat: wire lobby, board, clue bar, and P2P sync into App"
```

---

## Self-Review Notes

- **Spec coverage:** P2P host-authoritative sync (Tasks 6, 9), shared Unsplash board (Tasks 5, 9), 8/7/4/1 key (Task 2), guess/turn/clue rules and guess limit (Task 3), assassin loss + team win (Task 4), spymaster honor-system toggle (Tasks 7, 9), room create/join + status + host-left message (Tasks 8, 9), win/loss banner (Task 9). Deferred items (role-filtered views, host migration, lobby polish, reconnect, Unsplash fallback) are intentionally out of MVP scope per the spec roadmap.
- **Type consistency:** `GameState`, `Action`, `Card`, `Team`, `Clue` are defined once in `types.ts` and consumed unchanged. `createHost`/`createClient`/`Host`/`Client` signatures match between Tasks 6 and 9. `Board`, `Lobby`, `ClueBar`, `GameOver` prop shapes match their usage in `App`.
- **No placeholders:** every code step contains full code; commands include expected output.
```
