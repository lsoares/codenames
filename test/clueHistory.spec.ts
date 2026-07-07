import { test, expect } from '@playwright/test'
import { GamePage, stubUnsplash } from './gamePage'

// The end-of-game clue list is covered by the full game in endgame.spec; this
// keeps the input-only rule that needs no play.
test('the clue word is capped at 20 characters', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()

  await game.typeClueWord('a'.repeat(25))

  await expect(game.getClueInput()).toHaveValue('a'.repeat(20))
})
