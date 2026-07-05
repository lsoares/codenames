import { test, expect } from '@playwright/test'
import { GamePage, stubUnsplash } from './gamePage'

// When the game ends, closing it returns to the deck picker and re-deals the
// room in place — everyone stays put, and the win banner is gone.
test('after a win, closing the game deals a fresh board in the same room', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()
  const target = await game.getCardNumber('assassin')
  await game.giveClue('trap', 1)
  await game.releaseSpymaster()
  await game.guessNumber(target)
  await expect(game.getWinnerBanner()).toHaveText(/team wins/i)

  await game.closeGame('Random')

  await expect(game.getWinnerBanner()).not.toHaveText(/team wins/i)
  await expect(game.getCards()).toHaveCount(20)
})

// Picking a deck mid-play re-deals in place too, but a game in progress is wiped
// only after confirming, so an accidental click can't lose the board.
test('picking a deck mid-play re-deals after confirming', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()
  await game.giveClue('trap', 1)
  await expect(page.getByText('trap')).toBeVisible()

  page.once('dialog', (dialog) => dialog.accept())
  await game.closeGame('Random')

  await expect(page.getByText('trap')).toBeHidden()
  await expect(game.getCards()).toHaveCount(20)
})

// "New cards" re-deals the deck already in play without opening the picker,
// confirming first when a game is in progress.
test('New cards re-deals the current deck after confirming', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()
  await game.giveClue('trap', 1)
  await expect(page.getByText('trap')).toBeVisible()

  page.once('dialog', (dialog) => dialog.accept())
  await game.dealNewCards()

  await expect(page.getByText('trap')).toBeHidden()
  await expect(game.getCards()).toHaveCount(20)
})
