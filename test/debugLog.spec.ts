import { test, expect } from '@playwright/test'
import { GamePage, stubUnsplash } from './gamePage'

test('the debug badge opens the connection logs in a dialog', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()

  await game.openDebugLogs()

  await expect(game.getDebugLogDialog()).toBeVisible()
})
