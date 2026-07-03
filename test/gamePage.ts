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

// SUT client: drives the app through roles/labels only, hiding locators.
export class GamePage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto('/')
  }

  async openRoom(code: string): Promise<void> {
    await this.page.goto(`/#${code}`)
  }

  // The app auto-hosts a room on load; just wait until the board is ready.
  async createRoom(): Promise<void> {
    await this.cards().first().waitFor()
  }

  async roomCode(): Promise<string> {
    await this.page.waitForFunction(() => window.location.hash.length > 1)
    const hash = await this.page.evaluate(() => window.location.hash)
    return hash.replace(/^#/, '')
  }

  async reload(): Promise<void> {
    await this.page.reload()
  }

  async openMenu(): Promise<void> {
    const toggle = this.page.getByRole('button', { name: /options/i })
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
      await toggle.click()
    }
  }

  async closeMenu(): Promise<void> {
    const toggle = this.page.getByRole('button', { name: /options/i })
    if ((await toggle.getAttribute('aria-expanded')) === 'true') {
      await toggle.click()
    }
  }

  private async toggleSeat(team: 'red' | 'blue'): Promise<void> {
    await this.openMenu()
    await this.page.getByRole('button', { name: new RegExp(`^${team}$`, 'i') }).click()
    await this.closeMenu()
  }

  // Take a team's spymaster seat (reveals colours, may give clues, cannot guess).
  async enableSpymaster(team: 'red' | 'blue' = 'red'): Promise<void> {
    await this.toggleSeat(team)
  }

  // Release the seat to play as an operative again (can guess, colours hidden).
  async releaseSpymaster(team: 'red' | 'blue' = 'red'): Promise<void> {
    await this.toggleSeat(team)
  }

  async giveClue(word: string, count: number): Promise<void> {
    await this.page.getByRole('textbox').fill(word)
    await this.page.getByRole('spinbutton').fill(String(count))
    await this.page.getByRole('button', { name: /give clue/i }).click()
  }

  // Spymaster-only: the number of the first unrevealed card of a colour, so an
  // operative (who can't see colours) can be told which card to click.
  async cardNumber(color: Color): Promise<number> {
    const label = await this.card(color).first().getAttribute('aria-label')
    return Number(label?.match(/^Card (\d+)/)?.[1])
  }

  // Operative guess by card number (works without seeing the colour).
  async guessNumber(n: number): Promise<void> {
    await this.page.getByRole('button', { name: new RegExp(`^Card ${n}(,|$)`) }).click()
  }

  cards() {
    return this.page.getByRole('button', { name: /^Card \d+/ })
  }

  card(color: Color, options: { revealed?: boolean } = {}) {
    return this.page.getByRole('button', {
      name: new RegExp(`^Card \\d+, ${color}$`),
      disabled: options.revealed ?? false,
    })
  }

  async currentTurn(): Promise<Color> {
    const title = await this.page.getByTitle(/'s turn$/).getAttribute('title')
    return title?.toLowerCase().startsWith('red') ? 'red' : 'blue'
  }

  winnerBanner() {
    return this.page.getByRole('status')
  }
}
