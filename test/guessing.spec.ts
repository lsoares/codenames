import { test, expect } from '@playwright/test'
import { GamePage, stubUnsplash } from './gamePage'

test('a correct guess reveals the card and keeps the turn', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open()
  await game.createRoom()
  await game.enableSpymaster()
  const team = await game.currentTurn()
  const target = await game.cardNumber(team)
  await game.giveClue('signal', 2)

  await game.releaseSpymaster()
  await game.guessNumber(target)

  await expect(game.card(team, { revealed: true }).first()).toBeVisible()
  expect(await game.currentTurn()).toBe(team)
})
