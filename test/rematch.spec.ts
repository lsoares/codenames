import { test, expect } from '@playwright/test'
import { GamePage, stubUnsplash } from './gamePage'

// When the game ends, a "New game" button appears beside the win message; it
// re-deals the room in place. After it, there's no winner, so the button is gone.
test('after a win, New game deals a fresh board in the same room', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()
  const target = await game.getCardNumber('assassin')
  await game.giveClue('trap', 1)
  await game.releaseSpymaster()
  await game.guessNumber(target)
  await expect(game.getWinnerBanner()).toHaveText(/team wins/i)

  await game.startNewGameFromEnd('Random')

  await expect(page.getByRole('button', { name: 'New game' })).toBeHidden()
  await expect(game.getCards()).toHaveCount(20)
})
