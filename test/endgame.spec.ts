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

test('a full game — both sides play, miss on neutral and enemy, red then wins', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()
  // As the red spymaster every colour is visible, so note the cards up front and
  // drive both teams from this one tab (unlimited clues to keep turns flowing).
  const reds = await game.getCardNumbers('red')
  const blues = await game.getCardNumbers('blue')
  const neutrals = await game.getCardNumbers('neutral')

  // Red: one right, then a neutral — the miss hands the turn to blue.
  await game.giveClue('reds', 0)
  await game.releaseSpymaster('red')
  await game.guessNumber(reds[0])
  await game.guessNumber(neutrals[0])

  // Blue: switch over, one right, then an enemy (red) card — miss back to red.
  await game.switchToTeam('blue')
  await game.enableSpymaster('blue')
  await game.giveClue('blues', 0)
  await game.releaseSpymaster('blue')
  await game.guessNumber(blues[0])
  await game.guessNumber(reds[1])

  // Red again: switch back and clear the rest; the last red card wins it.
  await game.switchToTeam('red')
  await game.enableSpymaster('red')
  await game.giveClue('rest', 0)
  await game.releaseSpymaster('red')
  const rest = reds.slice(2)
  for (const n of rest.slice(0, -1)) await game.guessNumber(n)

  await game.guessNumber(rest[rest.length - 1])

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
