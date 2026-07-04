import { test, expect } from '@playwright/test'
import { GamePage, stubUnsplash } from './gamePage'

test('revealing the assassin ends the game for the other team', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()
  const guesser = await game.getCurrentTurn()
  const target = await game.getCardNumber('assassin')
  await game.giveClue('trap', 1)

  await game.releaseSpymaster()
  await game.guessNumber(target)

  const winner = guesser === 'red' ? 'blue' : 'red'
  await expect(game.getWinnerBanner()).toHaveText(new RegExp(`${winner} team wins`, 'i'))
})

test('revealing your team’s last card wins the game', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()
  // As the red spymaster, note every red card, then hand an unlimited clue and
  // drop to operative so a single turn can clear the whole team.
  const reds = await game.getCardNumbers('red')
  await game.giveClue('all', 0)
  await game.releaseSpymaster()
  for (const n of reds.slice(0, -1)) await game.guessNumber(n)

  await game.guessNumber(reds[reds.length - 1])

  await expect(game.getWinnerBanner()).toHaveText(/red team wins/i)
})

test('a neutral guess passes the turn to the other team', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()
  const before = await game.getCurrentTurn()
  const target = await game.getCardNumber('neutral')
  await game.giveClue('meh', 1)

  await game.releaseSpymaster()
  await game.guessNumber(target)

  const after = before === 'red' ? 'blue' : 'red'
  await expect.poll(() => game.getCurrentTurn()).toBe(after)
})
