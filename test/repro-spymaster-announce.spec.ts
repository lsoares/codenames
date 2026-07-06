import { test, expect } from '@playwright/test'
import { GamePage, stubUnsplash } from './gamePage'

test('a reconnecting spymaster is not re-announced as new to the host', async ({ browser }) => {
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

  // Guest joins and auto-takes the open blue spymaster seat.
  await guest.openRoom(code)
  await expect(guest.getCard('blue').first()).toBeVisible()
  await expect.poll(() => host.countPlayers()).toBe(2)

  // The guest reloads: same person reconnects into the same seat — nobody's
  // spymaster actually changed, so the host must NOT be told about a new one.
  await guest.reload()
  await expect(guest.getCard('blue').first()).toBeVisible()

  await expect(host.getByRoleStatus()).toContainText('New blue spymaster', { timeout: 20000 })

  await hostContext.close()
  await guestContext.close()
})
