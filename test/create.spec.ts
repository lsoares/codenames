import { test, expect } from '@playwright/test'
import { GamePage, stubUnsplash } from './gamePage'

test('creating a room shows a 20-card board', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)

  await game.open()
  await game.createRoom()

  await expect(game.cards()).toHaveCount(20)
})
