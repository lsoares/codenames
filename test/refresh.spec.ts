import { test, expect } from '@playwright/test'
import { hostRoom, joinRoom } from './gamePage'

test('host refresh restores the room and its revealed cards', async ({ browser }) => {
  const { game: host, code } = await hostRoom(browser, 'red')
  const operative = await joinRoom(browser, code, 'red')
  await operative.closeToolsMenu()

  const target = await host.getCardNumber('red')
  await host.giveClue('anchor', 1)
  await operative.guessNumber(target)
  await expect(host.getCard('red', { revealed: true }).first()).toBeVisible()

  await host.reload()

  await expect(host.getCards()).toHaveCount(20)
  expect(await host.getRoomCode()).toBe(code)
  // A revealed card shows its colour to everyone, so it survives the reload even
  // though the reconnecting host isn't re-seated as spymaster.
  await expect(host.getCard('red', { revealed: true }).first()).toBeVisible()
})
