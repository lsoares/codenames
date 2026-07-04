import { test, expect } from '@playwright/test'
import { GamePage, stubUnsplash } from './gamePage'

// Leaving a room drops back to the homepage deck picker, ready to start again.
// Alone on a fresh board there's nobody to disrupt, so no confirmation.
test('leaving a room returns to the homepage', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open()
  await game.createRoom()

  await game.leaveRoom()

  await expect(page.getByRole('heading', { name: 'Codenames Pictures' })).toBeVisible()
})
