import { test, expect } from '@playwright/test'
import { GamePage, stubUnsplash, stubDatamuse, STUB_WORDS } from './gamePage'

test('choosing Words builds a board of word cards', async ({ page }) => {
  await stubUnsplash(page)
  await stubDatamuse(page)
  const game = new GamePage(page)
  await game.open()
  await game.createRoom()

  await game.startGameWithSource('Words')

  // Word cards are named by their word (uppercase), not "Card N".
  for (const word of STUB_WORDS) {
    await expect(page.getByRole('button', { name: word, exact: true })).toBeVisible()
  }
})
