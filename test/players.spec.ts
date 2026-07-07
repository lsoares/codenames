import { test, expect } from '@playwright/test'
import { GamePage, stubUnsplash } from './gamePage'

test('a guest reload does not inflate the player count', async ({ browser }) => {
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
  await expect.poll(() => hostGame.countPlayers()).toBe(2)

  // A guest tab reload reconnects as a new peer; the stale connection from the
  // old tab must be pruned, not linger as a ghost that inflates the count.
  await guestGame.reload()
  await expect(guestGame.getCards()).toHaveCount(20)
  await expect.poll(() => hostGame.countPlayers(), { timeout: 15000 }).toBe(2)

  await hostContext.close()
  await guestContext.close()
})

test('a joining guest auto-takes an open spymaster seat', async ({ browser }) => {
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

  // Without claiming anything, the guest already sees the cards' colours — only a
  // spymaster does — proving an open seat filled automatically on arrival.
  await expect(guestGame.getCard('blue').first()).toBeVisible()

  await hostContext.close()
  await guestContext.close()
})

test('a guest that leaves is pruned from the player count', async ({ browser }) => {
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
  await expect.poll(() => hostGame.countPlayers()).toBe(2)

  // The guest closes its tab; the host must drop it, not keep a ghost.
  await guestContext.close()
  await expect.poll(() => hostGame.countPlayers(), { timeout: 15000 }).toBe(1)

  await hostContext.close()
})

test('a host reload (takeover) does not inflate the player count', async ({ browser }) => {
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
  await expect.poll(() => guestGame.countPlayers()).toBe(2)

  // The host reloads: a survivor takes over hosting and the old host rejoins as a
  // guest. Both peers must still count exactly two players, not ghosts.
  await hostGame.reload()
  await expect(hostGame.getCards()).toHaveCount(20)
  await expect.poll(() => guestGame.countPlayers(), { timeout: 20000 }).toBe(2)
  await expect.poll(() => hostGame.countPlayers(), { timeout: 20000 }).toBe(2)

  await hostContext.close()
  await guestContext.close()
})
