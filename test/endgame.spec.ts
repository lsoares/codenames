import { test, expect } from '@playwright/test'
import { GamePage, stubUnsplash } from './gamePage'

test('revealing the assassin ends the game for the other team', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()
  await game.enableSpymaster()
  const guesser = await game.currentTurn()
  const target = await game.cardNumber('assassin')
  await game.giveClue('trap', 1)

  await game.releaseSpymaster()
  await game.guessNumber(target)

  const winner = guesser === 'red' ? 'blue' : 'red'
  await expect(game.winnerBanner()).toHaveText(new RegExp(`${winner} team wins`, 'i'))
})

test('a neutral guess passes the turn to the other team', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()
  await game.enableSpymaster()
  const before = await game.currentTurn()
  const target = await game.cardNumber('neutral')
  await game.giveClue('meh', 1)

  await game.releaseSpymaster()
  await game.guessNumber(target)

  const after = before === 'red' ? 'blue' : 'red'
  await expect.poll(() => game.currentTurn()).toBe(after)
})
