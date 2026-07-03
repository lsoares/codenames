import { test, expect } from '@playwright/test'
import { GamePage, stubUnsplash } from './gamePage'

test('host refresh restores the room and its revealed cards', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open()
  await game.createRoom()
  const code = await game.roomCode()

  await game.enableSpymaster()
  const team = await game.currentTurn()
  const target = await game.cardNumber(team)
  await game.giveClue('anchor', 1)
  await game.releaseSpymaster()
  await game.guessNumber(target)
  await expect(game.card(team, { revealed: true }).first()).toBeVisible()

  await game.reload()

  await expect(game.cards()).toHaveCount(20)
  expect(await game.roomCode()).toBe(code)
  await game.enableSpymaster()
  await expect(game.card(team, { revealed: true }).first()).toBeVisible()
})
