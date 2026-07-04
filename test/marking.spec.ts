import { test, expect } from '@playwright/test'
import { GamePage, stubUnsplash } from './gamePage'

// An operative's candidate mark is a note for their own team: it can be placed
// on any turn (to plan ahead while the opponent plays), teammates see it, and
// the opposing team never does.
test('a mark is shared within the team, hidden from the other, and works off-turn', async ({
  browser,
}) => {
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
    browser.newContext(),
  ])
  const [hostPage, matePage, foePage] = await Promise.all(contexts.map((c) => c.newPage()))
  await Promise.all([hostPage, matePage, foePage].map(stubUnsplash))

  const host = new GamePage(hostPage) // red
  const mate = new GamePage(matePage) // red (joins 2nd)
  const foe = new GamePage(foePage) // blue (joins 1st)

  // Blue starts, so red is off-turn from the opening move.
  await host.open('blue')
  await host.createRoom()
  const code = await host.getRoomCode()

  // Join order fixes the auto-teams: host=red, first joiner=blue, second=red.
  await foe.openRoom(code)
  await expect(foe.getCards()).toHaveCount(20)
  await mate.openRoom(code)
  await expect(mate.getCards()).toHaveCount(20)

  // Everyone plays as an operative (the host and blue joiner drop their auto
  // spymaster seats), so all three see the operatives' marked view.
  await host.releaseSpymaster('red')
  await foe.releaseSpymaster('blue')

  // A red operative marks a card while blue is on turn.
  await mate.markCard(1)

  // Both red operatives see the mark; the blue operative never does.
  await expect(mate.findMarkedCard(1)).toBeVisible()
  await expect(host.findMarkedCard(1)).toBeVisible()
  await expect(foe.findMarkedCard(1)).toHaveCount(0)

  await Promise.all(contexts.map((c) => c.close()))
})
