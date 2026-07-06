import { test, expect } from '@playwright/test'
import { GamePage, stubUnsplash } from './gamePage'

// A joiner is learning the room's existing state, not witnessing a change: the
// spymasters already seated when they arrive must not be announced as "new".
test('a joiner is not told existing spymasters are new', async ({ browser }) => {
  const hostContext = await browser.newContext()
  const guestContext = await browser.newContext()
  const hostPage = await hostContext.newPage()
  const guestPage = await guestContext.newPage()
  await stubUnsplash(hostPage)
  await stubUnsplash(guestPage)

  const host = new GamePage(hostPage)
  const guest = new GamePage(guestPage)

  await host.open('red')
  await host.createRoom()
  const code = await host.getRoomCode()

  await guest.openRoom(code)

  // Seated (blue colours visible) yet no toast — the pre-existing red spymaster
  // and the guest's own auto-seat were a silent baseline, not a "New spymaster".
  await expect(guest.getCard('blue').first()).toBeVisible()
  expect(await guest.getByRoleStatus().count()).toBe(0)

  await hostContext.close()
  await guestContext.close()
})

// The flip side: once you're in the room, a genuinely new spymaster taking a
// seat still announces to everyone else.
test('a genuinely new spymaster is announced to those already in the room', async ({ browser }) => {
  const hostContext = await browser.newContext()
  const guestContext = await browser.newContext()
  const hostPage = await hostContext.newPage()
  const guestPage = await guestContext.newPage()
  await stubUnsplash(hostPage)
  await stubUnsplash(guestPage)

  const host = new GamePage(hostPage)
  const guest = new GamePage(guestPage)

  await host.open('red')
  await host.createRoom()
  const code = await host.getRoomCode()

  // The guest joins as blue spymaster and, being off-turn, watches the status
  // pill (the on-turn red spymaster sees the clue form instead).
  await guest.openRoom(code)
  await expect(guest.getCard('blue').first()).toBeVisible()

  // The host vacates and re-claims red: a genuine new spymaster the guest, who
  // was already in the room, must be told about.
  await host.releaseSpymaster('red')
  await host.enableSpymaster('red')

  await expect(guest.getByRoleStatus()).toContainText('New red spymaster', { timeout: 20000 })

  await hostContext.close()
  await guestContext.close()
})
