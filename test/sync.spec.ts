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

  await hostGame.open('red')
  await hostGame.createRoom()
  const code = await hostGame.getRoomCode()

  await guestGame.openRoom(code)
  await expect(guestGame.getCards()).toHaveCount(20)

  // Guest takes the red spymaster seat and clues; the host is the red operative
  // (auto-assigned) who guesses on red's turn. The reveal must sync to both.
  await guestGame.enableSpymaster('red')
  const target = await guestGame.getCardNumber('red')
  await guestGame.giveClue('link', 1)

  await hostGame.guessNumber(target)

  await expect(hostGame.getCard('red', { revealed: true }).first()).toBeVisible()
  await expect(guestGame.getCard('red', { revealed: true }).first()).toBeVisible()

  await hostContext.close()
  await guestContext.close()
})
