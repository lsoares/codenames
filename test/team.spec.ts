import { test, expect } from '@playwright/test'
import { GamePage, stubUnsplash } from './gamePage'

// The host opens already holding the red spymaster seat, so it sees colours.
// Joining blue on a fresh board switches sides immediately (no prompt): as a
// blue operative the host no longer sees any card's colour, and the whole app
// reorients to blue — the tab title now reads from the blue perspective.
test('clicking the other team on a fresh board joins it directly', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()

  await expect(game.getCard('red').first()).toBeVisible()
  await game.joinTeam('blue')

  await expect(game.getByRoleStatus()).toHaveText(/joined blue/i)
  await expect(game.getCard('red')).toHaveCount(0)
  await expect(page).toHaveTitle(/blue/i)
})

// The operative emoji count follows real team membership: the host, a red
// spymaster, joins blue and now shows as a lone blue operative — not red.
test('the operative count moves with you when you switch team', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()

  await game.joinTeam('blue')

  await expect.poll(() => game.countTeamOperatives('blue')).toBe(1)
  await expect.poll(() => game.countTeamOperatives('red')).toBe(0)
})

// Mid-game (a clue is out) switching asks first; accepting moves you.
test('switching teams mid-game confirms, and accepting joins', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()
  await game.giveClue('anchor', 1)

  page.once('dialog', (dialog) => dialog.accept())
  await game.joinTeam('blue')

  await expect(game.getCard('red')).toHaveCount(0)
})

// Mid-game, dismissing the prompt keeps you where you were (still see colours).
test('switching teams mid-game can be cancelled', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()
  await game.giveClue('anchor', 1)

  page.once('dialog', (dialog) => dialog.dismiss())
  await game.joinTeam('blue')

  await expect(game.getCard('red').first()).toBeVisible()
})
