import { test, expect } from '@playwright/test'
import { hostRoom, joinRoom } from './gamePage'

// Re-dealing the room (New game) is a spymaster's call, so the tools menu hides
// the control from operatives.
test('an operative has no re-deal control in the tools menu', async ({ browser }) => {
  const { code } = await hostRoom(browser, 'red')
  const operative = await joinRoom(browser, code, 'red')
  await operative.closeToolsMenu()

  await operative.openToolsMenu()

  await expect(operative.findReshuffleButton()).toHaveCount(0)
})

test('a spymaster can start a new game from the tools menu', async ({ browser }) => {
  const { game: spymaster } = await hostRoom(browser, 'red')

  await spymaster.openToolsMenu()

  await expect(spymaster.findReshuffleButton()).toBeVisible()
})
