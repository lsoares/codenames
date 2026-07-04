import { test, expect } from '@playwright/test'
import { GamePage, stubUnsplash } from './gamePage'

test('browser back leaves a game for the homepage', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open()
  await game.createRoom()

  await page.goBack()

  await expect(page.getByRole('heading', { name: 'Codenames Anything' })).toBeVisible()
})
