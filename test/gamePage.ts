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

  async openRoom(code: string): Promise<void> {
    await this.page.goto(`/#${code}`)
  }

  // The app auto-hosts a room on load; just wait until the board is ready.
  async createRoom(): Promise<void> {
    await this.getCards().first().waitFor()
  }

  // The room code is the URL hash the app puts in the address bar for sharing.
  async getRoomCode(): Promise<string> {
    await this.page.waitForURL(/#.+/)
    return new URL(this.page.url()).hash.replace(/^#/, '')
  }

  async reload(): Promise<void> {
    await this.page.reload()
  }

  // The menu button lives in the header centre. Flows open it, and picking a menu
  // item (a seat or a source) closes it again, so opening is a single click.
  async openMenu(): Promise<void> {
    await this.page.getByTitle('Menu', { exact: true }).click()
  }

  // Start a new game from a specific card source: New game reveals the sources.
  async startGameWithSource(label: string): Promise<void> {
    await this.openMenu()
    await this.page.getByRole('button', { name: /new game/i }).click()
    await this.page.getByRole('button', { name: label, exact: true }).click()
  }

  private async toggleSeat(team: 'red' | 'blue'): Promise<void> {
    await this.openMenu()
    await this.page.getByRole('button', { name: new RegExp(`^${team}$`, 'i') }).click()
  }

  // Take a spymaster seat (defaults to the team on turn, since only that team's
  // spymaster may clue). Reveals colours, may clue, cannot guess.
  async enableSpymaster(team?: 'red' | 'blue'): Promise<void> {
    await this.toggleSeat(team ?? (await this.getCurrentTurn()))
  }

  // Release the seat to play as an operative again (defaults to the turn's team).
  async releaseSpymaster(team?: 'red' | 'blue'): Promise<void> {
    await this.toggleSeat(team ?? (await this.getCurrentTurn()))
  }

  async giveClue(word: string, count: number): Promise<void> {
    await this.page.getByRole('textbox').fill(word)
    await this.page.getByRole('spinbutton').fill(String(count))
    await this.page.getByRole('button', { name: /give clue/i }).click()
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

  getWinnerBanner() {
    return this.page.getByRole('status')
  }
}
