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

test('a full game — cap runs out, misses on neutral and enemy, red then wins', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()
  // As the red spymaster every colour is visible, so note the cards up front and
  // drive both teams from this one tab.
  const reds = await game.getCardNumbers('red')
  const blues = await game.getCardNumbers('blue')
  const neutrals = await game.getCardNumbers('neutral')

  // Red: a clue for 1 grants two guesses; two right in a row spend them, so the
  // turn passes to blue on a hit — not a miss.
  await game.giveClue('reds', 1)
  await game.releaseSpymaster('red')
  await game.guessNumber(reds[0])
  await game.guessNumber(reds[1])
  await expect.poll(() => game.getCurrentTurn()).toBe('blue')

  // Blue: one right, then a neutral — the miss hands the turn back to red.
  await game.switchToTeam('blue')
  await game.enableSpymaster('blue')
  await game.giveClue('blues', 0)
  await game.releaseSpymaster('blue')
  await game.guessNumber(blues[0])
  await game.guessNumber(neutrals[0])

  // Red: one right, then an enemy (blue) card — the miss passes to blue.
  await game.switchToTeam('red')
  await game.enableSpymaster('red')
  await game.giveClue('more', 0)
  await game.releaseSpymaster('red')
  await game.guessNumber(reds[2])
  await game.guessNumber(blues[1])

  // Blue: one right, then a neutral — back to red for the finish.
  await game.switchToTeam('blue')
  await game.enableSpymaster('blue')
  await game.giveClue('again', 0)
  await game.releaseSpymaster('blue')
  await game.guessNumber(blues[2])
  await game.guessNumber(neutrals[1])

  // Red again: clear the rest; the last red card wins it.
  await game.switchToTeam('red')
  await game.enableSpymaster('red')
  await game.giveClue('rest', 0)
  await game.releaseSpymaster('red')
  const rest = reds.slice(3)
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
