import { type Page } from '@playwright/test'

type Color = 'red' | 'blue' | 'neutral' | 'assassin'

// Return 20 canned photos so the board is deterministic and offline.
export async function stubUnsplash(page: Page): Promise<void> {
  await page.route('**/api.unsplash.com/**', (route) =>
    route.fulfill({
      json: Array.from({ length: 20 }, (_, index) => ({
        urls: {
          small: `https://example.com/${index}.jpg`,
          regular: `https://example.com/${index}.jpg`,
        },
      })),
    }),
  )
}

// Return 20 canned photos so a Pexels-sourced board is deterministic and offline.
export async function stubPexels(page: Page): Promise<void> {
  await page.route('**/api.pexels.com/**', (route) =>
    route.fulfill({
      json: {
        photos: Array.from({ length: 20 }, (_, index) => ({
          src: {
            medium: `https://example.com/pexels/${index}.jpg`,
            small: `https://example.com/pexels/${index}.jpg`,
          },
        })),
      },
    }),
  )
}

// Return two pages of 20 canned movies (each with a backdrop) so a TMDB-sourced
// board is deterministic and offline.
export async function stubTmdb(page: Page): Promise<void> {
  await page.route('**/api.themoviedb.org/**', (route) =>
    route.fulfill({
      json: {
        results: Array.from({ length: 20 }, (_, index) => ({
          backdrop_path: `/backdrop${index}.jpg`,
        })),
      },
    }),
  )
}

// Datamuse returns exactly 20 canned nouns (with the tags the filter needs), so
// the word board is deterministic and every stubbed word ends up on the board.
export const STUB_WORDS = [
  'APPLE', 'TIGER', 'RIVER', 'ENGINE', 'CASTLE', 'GUITAR', 'PLANET', 'ANCHOR',
  'JUNGLE', 'ROCKET', 'PIRATE', 'VIOLIN', 'DRAGON', 'HELMET', 'LANTERN', 'COMPASS',
  'ROBOT', 'SPIDER', 'VOLCANO', 'WINDMILL',
]

export async function stubDatamuse(page: Page): Promise<void> {
  await page.route('**/api.datamuse.com/**', (route) =>
    route.fulfill({
      json: STUB_WORDS.map((word) => ({ word: word.toLowerCase(), tags: ['n', 'f:40'] })),
    }),
  )
}

// Return 20 canned cat photos so a Cats-sourced board is deterministic.
export async function stubCats(page: Page): Promise<void> {
  await page.route('**/api.thecatapi.com/**', (route) =>
    route.fulfill({
      json: Array.from({ length: 20 }, (_, index) => ({ url: `https://example.com/cat/${index}.jpg` })),
    }),
  )
}

// Foodish answers one image per call, so hand back a fresh URL each time to keep
// the deck's dedupe happy.
export async function stubFoodish(page: Page): Promise<void> {
  let served = 0
  await page.route('**/foodish-api.com/**', (route) =>
    route.fulfill({ json: { image: `https://example.com/food/${served++}.jpg` } }),
  )
}

// PokéAPI is hit once per dex id; derive the image from the id so each is unique.
export async function stubPokemon(page: Page): Promise<void> {
  await page.route('**/pokeapi.co/**', (route) => {
    const id = route.request().url().split('/').filter(Boolean).pop()
    route.fulfill({
      json: { sprites: { other: { 'official-artwork': { front_default: `https://example.com/pokemon/${id}.png` } } } },
    })
  })
}

// The geeks deck degrades to its word bank when StackExchange yields nothing, so
// an empty tag list keeps it offline while still producing word cards.
export async function stubStackExchange(page: Page): Promise<void> {
  await page.route('**/api.stackexchange.com/**', (route) => route.fulfill({ json: { items: [] } }))
}

// Picbreeder validates each thumbnail by loading it as an image, so answer with a
// real 1×1 PNG (decoded by content, not extension) so the deck fills its board.
const ONE_PX_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)
export async function stubPicbreeder(page: Page): Promise<void> {
  await page.route('**/picbreeder.net/**', (route) =>
    route.fulfill({ contentType: 'image/png', body: ONE_PX_PNG }),
  )
}

// The Mix deck draws from every other deck at once, so stub the lot to keep a
// Mix-sourced board deterministic and offline.
export async function stubMixSources(page: Page): Promise<void> {
  await stubDatamuse(page)
  await stubUnsplash(page)
  await stubPexels(page)
  await stubTmdb(page)
  await stubCats(page)
  await stubFoodish(page)
  await stubPokemon(page)
  await stubStackExchange(page)
  await stubPicbreeder(page)
}

// SUT client: drives the app through roles/labels only, hiding locators.
export class GamePage {
  constructor(private readonly page: Page) {}

  // Auto-teams are gated by turn, so pin the host's starting team for a
  // deterministic single-player flow (the host is always auto-assigned red).
  async open(startTeam?: 'red' | 'blue'): Promise<void> {
    if (startTeam) {
      await this.page.addInitScript(
        (team) => localStorage.setItem('codenames:start-team', team),
        startTeam,
      )
    }
    await this.page.goto('/')
  }

  // Join a room. A pinned team makes the joiner land on that side deterministically
  // (auto-seated as its spymaster if the seat is open, else an operative), so a
  // multi-tab game can be set up without relying on the auto-balancer's coin toss.
  async openRoom(code: string, startTeam?: 'red' | 'blue'): Promise<void> {
    if (startTeam) {
      await this.page.addInitScript(
        (team) => localStorage.setItem('codenames:start-team', team),
        startTeam,
      )
    }
    await this.page.goto(`/${code}`)
  }

  // The homepage lists decks; picking one hosts a room. Random is the default
  // (image) deck the suite plays on, so start there and wait for the board.
  async createRoom(): Promise<void> {
    await this.page.getByRole('button', { name: 'Random', exact: true }).click()
    await this.getCards().first().waitFor()
  }

  // Start a game from a named homepage deck, waiting until the room is up (its
  // code lands in the URL). Deck-agnostic — word boards have no "Card N" labels.
  async startWithDeck(label: string): Promise<void> {
    await this.page.getByRole('button', { name: label, exact: true }).click()
    await this.page.waitForURL(/\/[a-z0-9-]+$/)
  }

  // The room code is the URL path the app puts in the address bar for sharing.
  async getRoomCode(): Promise<string> {
    await this.page.waitForURL(/\/[a-z0-9-]+$/)
    return new URL(this.page.url()).pathname.replace(/^\//, '')
  }

  async reload(): Promise<void> {
    await this.page.reload()
  }

  // The 🔀 "New game" tool re-deals the current deck in place (rotating the
  // spymasters); a game in progress prompts a confirm first (arm a dialog handler).
  async dealNewCards(): Promise<void> {
    await this.openToolsMenu()
    await this.page.getByRole('button', { name: 'New game' }).click()
  }

  // "Change deck" opens the deck picker without leaving the room; a game in
  // progress prompts a confirm first (arm a dialog handler).
  async openDeckPicker(): Promise<void> {
    await this.openToolsMenu()
    await this.page.getByRole('button', { name: 'Change deck' }).click()
  }

  getDeckPicker() {
    return this.page.getByRole('dialog', { name: 'Pick a deck' })
  }

  // Pick a deck in the picker to re-deal the room in place.
  async closeGame(label: string): Promise<void> {
    await this.openDeckPicker()
    await this.getDeckPicker().getByRole('button', { name: label, exact: true }).click()
  }

  // Take a spymaster seat (defaults to the team on turn). Arm a dialog acceptor
  // before clicking because mid-game the app prompts for confirmation.
  async enableSpymaster(team?: 'red' | 'blue'): Promise<void> {
    const t = team ?? (await this.getCurrentTurn())
    this.page.once('dialog', (dialog) => dialog.accept())
    await this.page.getByRole('button', { name: `Become ${t} spymaster` }).click()
  }

  // Release the seat to play as an operative again (defaults to the turn's team).
  // No dialog — stepping down never prompts. The caller must already hold that
  // team's seat, or the "Step down as {t} spymaster" button won't exist.
  async releaseSpymaster(team?: 'red' | 'blue'): Promise<void> {
    const t = team ?? (await this.getCurrentTurn())
    await this.page.getByRole('button', { name: `Step down as ${t} spymaster` }).click()
  }

  async giveClue(word: string, count: number): Promise<void> {
    await this.page.getByRole('textbox').fill(word)
    await this.page.getByRole('spinbutton').fill(String(count))
    await this.page.getByRole('button', { name: /give clue/i }).click()
  }

  // Type into the clue word field with real key presses, so the browser's
  // maxlength is honoured (fill would bypass it).
  async typeClueWord(text: string): Promise<void> {
    await this.page.getByRole('textbox').pressSequentially(text)
  }

  getClueInput() {
    return this.page.getByRole('textbox')
  }

  // At game end, the clues a team gave — one list item per clue, shown on that
  // team's side of the header.
  getTeamClues(team: 'red' | 'blue') {
    return this.page.getByRole('list', { name: `${team} clues` }).getByRole('listitem')
  }

  // The corner hamburger groups the invite, logs, and close-game tools.
  async openToolsMenu(): Promise<void> {
    await this.page.getByRole('button', { name: 'Menu' }).click()
  }

  // The tools menu holds the join QR and the room name (click to copy the link).
  getJoinLinkButton() {
    return this.page.getByRole('button', { name: 'Copy join link' })
  }

  async copyRoomLink(): Promise<void> {
    await this.getJoinLinkButton().click()
  }

  getCopiedNote() {
    return this.page.getByText('Copied!')
  }

  // The board footer links the deck the board was dealt from to its source.
  getBoardType() {
    return this.page.getByRole('link', { name: /, by / })
  }

  // Spymaster-only: the number of the first unrevealed card of a colour, so an
  // operative (who can't see colours) can be told which card to click.
  async getCardNumber(color: Color): Promise<number> {
    const label = await this.getCard(color).first().getAttribute('aria-label')
    return Number(label?.match(/^Card (\d+)/)?.[1])
  }

  // Every unrevealed card number of a colour (spymaster view).
  async getCardNumbers(color: Color): Promise<number[]> {
    const labels = await this.getCard(color).evaluateAll((els) =>
      els.map((el) => el.getAttribute('aria-label') ?? ''),
    )
    return labels.map((l) => Number(l.match(/^Card (\d+)/)?.[1]))
  }

  // Operative guess by card number (works without seeing the colour).
  async guessNumber(n: number): Promise<void> {
    await this.page.getByRole('button', { name: new RegExp(`^Card ${n}(,|$)`) }).click()
  }

  // Operative marks a card by number via its hover pin icon, allowed on any turn.
  async markCard(n: number): Promise<void> {
    await this.page.getByRole('button', { name: `Mark Card ${n}`, exact: true }).click()
  }

  // A card the viewer sees as marked by their own team.
  findMarkedCard(n: number) {
    return this.page.getByRole('button', { name: `Card ${n}, marked`, exact: true })
  }

  getCards() {
    return this.page.getByRole('button', { name: /^Card \d+/ })
  }

  getCard(color: Color, options: { revealed?: boolean } = {}) {
    return this.page.getByRole('button', {
      name: new RegExp(`^Card \\d+, ${color}$`),
      disabled: options.revealed ?? false,
    })
  }

  async getCurrentTurn(): Promise<'red' | 'blue'> {
    const title = await this.page.getByTitle(/'s turn$/).getAttribute('title')
    return title?.toLowerCase().startsWith('red') ? 'red' : 'blue'
  }

  // The little team-coloured count card doubles as "join this team".
  async joinTeam(team: 'red' | 'blue'): Promise<void> {
    await this.page.getByRole('button', { name: `Join ${team} team` }).click()
  }

  // Switch sides mid-game, which prompts a confirmation; accept it.
  async switchToTeam(team: 'red' | 'blue'): Promise<void> {
    this.page.once('dialog', (dialog) => dialog.accept())
    await this.page.getByRole('button', { name: `Join ${team} team` }).click()
  }

  // The transient toast / sticky announcement shown in the header status pill.
  getByRoleStatus() {
    return this.page.getByRole('status')
  }

  // The win announcement is folded into that same status pill.
  getWinnerBanner() {
    return this.getByRoleStatus()
  }

  // At game end the winning team's clue list is badged with a trophy labelled
  // "{team} team wins" — a stable, viewer-independent marker of the result.
  getWinBadge(team: 'red' | 'blue') {
    return this.page.getByRole('img', { name: `${team} team wins` })
  }

  // The outcome emoji flashed over a card the instant it's revealed. Labelled by
  // outcome so a guess reads as a hit, miss, neutral, or the assassin.
  findFeedback(outcome: 'correct' | 'wrong' | 'neutral' | 'assassin') {
    const label = {
      correct: 'correct guess',
      wrong: 'wrong guess',
      neutral: 'neutral card',
      assassin: 'assassin',
    }[outcome]
    return this.page.getByRole('img', { name: label })
  }

  // Each player is a labelled face (e.g. "blue operative", "red spymaster"), so
  // counting them reads how many players the room believes are present.
  async countPlayers(): Promise<number> {
    return this.page.getByRole('img', { name: /operative|spymaster/ }).count()
  }

  // The operative faces on one team, so a switch can be read as the count
  // moving from one side to the other.
  async countTeamOperatives(team: 'red' | 'blue'): Promise<number> {
    return this.page.getByRole('img', { name: `${team} operative` }).count()
  }
}
