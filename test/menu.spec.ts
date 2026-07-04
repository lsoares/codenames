import { test, expect } from '@playwright/test'
import { GamePage, stubUnsplash } from './gamePage'

// The header menu overlays the clue input, so touching the clue must dismiss it —
// otherwise the open menu keeps sitting over the field the spymaster is editing.
test('interacting with the clue input closes an open menu', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()

  await game.openMenu()
  await expect(game.findMenu()).toBeVisible()

  await game.focusClueNumber()
  await expect(game.findMenu()).toBeHidden()
})
