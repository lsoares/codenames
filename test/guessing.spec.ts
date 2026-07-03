import { test, expect } from '@playwright/test'
import { GamePage, stubUnsplash } from './gamePage'

test('a correct guess reveals the card and keeps the turn', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()
  await game.enableSpymaster()
  const team = await game.getCurrentTurn()
  const target = await game.getCardNumber(team)
  await game.giveClue('signal', 2)

  await game.releaseSpymaster()
  await game.guessNumber(target)

  await expect(game.getCard(team, { revealed: true }).first()).toBeVisible()
  expect(await game.getCurrentTurn()).toBe(team)
})

test('a clue of 0 allows more than one guess (unlimited)', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()

  const team = await game.getCurrentTurn()
  await game.enableSpymaster(team)
  const [first, second] = await game.getCardNumbers(team)
  await game.giveClue('zero', 0)

  await game.releaseSpymaster(team)
  await game.guessNumber(first)
  await game.guessNumber(second)

  // A capped (count + 1 = 1) clue would end the turn after the first guess.
  await expect(game.getCard(team, { revealed: true })).toHaveCount(2)
  expect(await game.getCurrentTurn()).toBe(team)
})
