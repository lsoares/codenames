import { test, expect } from '@playwright/test'
import { GamePage, stubUnsplash, stubPexels } from './gamePage'

test('choosing Pexels sources the next game from Pexels', async ({ page }) => {
  await stubUnsplash(page)
  await stubPexels(page)
  const game = new GamePage(page)

  await game.open()
  await game.createRoom()

  const pexelsRequest = page.waitForRequest('**/api.pexels.com/**')
  await game.newGameWithSource('Pexels')
  await pexelsRequest

  await expect(game.cards()).toHaveCount(20)
})
