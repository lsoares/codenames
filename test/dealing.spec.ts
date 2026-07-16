import { test, expect } from '@playwright/test'
import { GamePage } from './gamePage'

test('picking a deck shows a loading spinner on its tile while dealing', async ({ page }) => {
  await page.route('**/api.unsplash.com/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    await route.fulfill({
      json: Array.from({ length: 20 }, (_, index) => ({
        urls: {
          small: `https://example.com/${index}.jpg`,
          regular: `https://example.com/${index}.jpg`,
        },
      })),
    })
  })
  const game = new GamePage(page)
  await game.open()

  await game.showMoreDecks()
  await game.pickDeck('Random')

  await expect(game.findDealingSpinner('Random')).toBeVisible()
  await expect(game.getCards()).toHaveCount(20)
})
