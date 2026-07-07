import { test, expect } from '@playwright/test'
import { GamePage, stubUnsplash } from './gamePage'

// Before play, clicking the other team re-homes you to it: the switch is
// immediate (no prompt on a fresh board) and, its seat being open, auto-seats you
// as that team's spymaster — you leave your old seat empty behind you.
test('joining the other team before play re-homes you as its spymaster', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()
  await expect(page.getByRole('img', { name: 'red spymaster' })).toBeVisible()

  await game.joinTeam('blue')

  await expect(page.getByRole('img', { name: 'blue spymaster' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'red spymaster' })).toHaveCount(0)
})
