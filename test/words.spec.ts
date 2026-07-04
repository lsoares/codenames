import { test, expect } from '@playwright/test'
import { GamePage, stubUnsplash, stubDatamuse, STUB_WORDS } from './gamePage'

test('choosing Words builds a board of word cards', async ({ page }) => {
  await stubUnsplash(page)
  await stubDatamuse(page)
  const game = new GamePage(page)
  await game.open()
  await game.createRoom()

  await game.startGameWithSource('Words')

  // View as an operative so cards read as the bare word: the host auto-seats as
  // the red spymaster, whose cards carry a ", colour" suffix. Release red itself
  // (not the turn's team, which is random here) or the seat stays held.
  await game.releaseSpymaster('red')

  // Word cards are named by their word (uppercase), not "Card N".
  for (const word of STUB_WORDS) {
    await expect(page.getByRole('button', { name: word, exact: true })).toBeVisible()
  }
})
