import { test, expect } from '@playwright/test'
import { hostRoom, joinRoom } from './gamePage'

// With a full room and a spymaster thinking, the whack break is on for every
// player who isn't the one giving the clue. Pressing Escape bows out of it.
test('pressing Escape leaves the whack-a-mole for the round', async ({ browser }) => {
  const { code } = await hostRoom(browser, 'red')
  const redOp = await joinRoom(browser, code, 'red')
  const blueSpy = await joinRoom(browser, code, 'blue')
  await joinRoom(browser, code, 'blue')
  await expect(redOp.findMoleScores()).toBeVisible()

  await redOp.leaveMoleGame()

  await expect(redOp.findMoleScores()).toHaveCount(0)
})
