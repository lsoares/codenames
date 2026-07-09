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
  await guest.closeToolsMenu()

  // Seated (blue colours visible) yet no toast — the pre-existing red spymaster
  // and the guest's own auto-seat were a silent baseline, not a "New spymaster".
  await expect(guest.getCard('blue').first()).toBeVisible()
  expect(await guest.getByRoleStatus().count()).toBe(0)

  await hostContext.close()
  await guestContext.close()
})
