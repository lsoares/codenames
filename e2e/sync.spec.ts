import { test, expect } from '@playwright/test'
import { GamePage, stubUnsplash } from './gamePage'

test('two players see the same board and reveals sync', async ({ browser }) => {
  const hostContext = await browser.newContext()
  const guestContext = await browser.newContext()
  const hostPage = await hostContext.newPage()
  const guestPage = await guestContext.newPage()
  await stubUnsplash(hostPage)
  await stubUnsplash(guestPage)

  const hostGame = new GamePage(hostPage)
  const guestGame = new GamePage(guestPage)

  await hostGame.open()
  await hostGame.createRoom()
  const code = await hostGame.roomCode()

  await guestGame.openRoom(code)
  await expect(guestGame.cards()).toHaveCount(20)

  await hostGame.enableSpymaster()
  const team = await hostGame.currentTurn()
  await hostGame.giveClue('link', 1)
  await hostGame.guess(team)

  await expect(guestGame.card(team, { revealed: true }).first()).toBeVisible()

  await hostContext.close()
  await guestContext.close()
})
