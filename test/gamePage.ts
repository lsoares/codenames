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

  async createRoom(): Promise<void> {
    await this.page.getByRole('button', { name: /create room/i }).click()
  }

  async roomCode(): Promise<string> {
    const hash = await this.page.evaluate(() => window.location.hash)
    return hash.replace(/^#/, '')
  }

  async reload(): Promise<void> {
    await this.page.reload()
  }

  async enableSpymaster(): Promise<void> {
    await this.page.getByRole('checkbox', { name: /spymaster/i }).check()
  }

  async giveClue(word: string, count: number): Promise<void> {
    await this.page.getByLabel('Clue').fill(word)
    await this.page.getByLabel('Number').fill(String(count))
    await this.page.getByRole('button', { name: /give clue/i }).click()
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

  async guess(color: Color): Promise<void> {
    await this.card(color).first().click()
  }

  async currentTurn(): Promise<Color> {
    const text = await this.page.getByRole('heading', { name: /turn$/i }).innerText()
    return text.toLowerCase().startsWith('red') ? 'red' : 'blue'
  }

  winnerBanner() {
    return this.page.getByRole('status')
  }
}
