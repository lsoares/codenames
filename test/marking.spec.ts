import { test, expect } from '@playwright/test'
import { hostRoom, joinRoom } from './gamePage'

// An operative's candidate mark is a note for their own team: it can be placed
// off-turn (to plan ahead while the opponent plays), teammates see it, and the
// opposing team never does. While a spymaster thinks the pins give way to the
// whack-a-mole game, so the mark goes down once the opponent's clue is in play.
test('a mark is shared within the team, hidden from the other, and works off-turn', async ({
  browser,
}) => {
  // Blue starts (host on blue), so red is off-turn from the opening move. Red
  // fields a spymaster and two operatives; the mark is a red operative's note.
  const { game: blueSpy, code } = await hostRoom(browser, 'blue')
  await joinRoom(browser, code, 'red') // red spymaster (auto-takes the open seat)
  const redMate = await joinRoom(browser, code, 'red') // red operative
  const redOp = await joinRoom(browser, code, 'red') // red operative — the marker
  await blueSpy.giveClue('river', 1)

  await redOp.markCard(1)

  await expect(redOp.findMarkedCard(1)).toBeVisible()
  await expect(redMate.findMarkedCard(1)).toBeVisible()
  await expect(blueSpy.findMarkedCard(1)).toHaveCount(0)
})
