import { test, expect } from '@playwright/test'
import { GamePage, stubUnsplash } from './gamePage'

test('host refresh restores the room and its revealed cards', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()
  const code = await game.getRoomCode()

  const team = await game.getCurrentTurn()
  const target = await game.getCardNumber(team)
  await game.giveClue('anchor', 1)
  await game.releaseSpymaster()
  await game.guessNumber(target)
  await expect(game.getCard(team, { revealed: true }).first()).toBeVisible()

  await game.reload()

  await expect(game.getCards()).toHaveCount(20)
  expect(await game.getRoomCode()).toBe(code)
  await game.enableSpymaster()
  await expect(game.getCard(team, { revealed: true }).first()).toBeVisible()
})
