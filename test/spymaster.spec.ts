import { test, expect } from '@playwright/test'
import { GamePage, stubUnsplash } from './gamePage'

// The header spymaster slot is always present. Clicking it when empty claims the
// seat — on a fresh board no confirmation is needed.
test('claiming the spymaster seat from the header shows the icon', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()

  // Release the auto-held red seat so the slot is empty.
  await game.releaseSpymaster('red')
  await expect(page.getByRole('img', { name: 'red spymaster' })).toHaveCount(0)

  // Re-claim from the header on a fresh board (no dialog expected).
  await game.enableSpymaster('red')
  await expect(page.getByRole('img', { name: 'red spymaster' })).toBeVisible()
})

// Clicking the slot when you already hold the seat steps you down without any
// confirmation prompt — stepping down is always instant.
test('stepping down from the header slot releases the seat without a prompt', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()

  // Host starts as red spymaster — colours are visible.
  await expect(game.getCard('red').first()).toBeVisible()

  await game.releaseSpymaster('red')

  // No longer spymaster — card colours are hidden.
  await expect(game.getCard('red')).toHaveCount(0)
})

// Mid-game, dismissing the confirmation dialog leaves the seat vacant.
test('claiming mid-game can be cancelled', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()

  await game.giveClue('anchor', 1)
  await game.releaseSpymaster('red')

  // Dismiss the mid-game confirm — seat stays empty.
  page.once('dialog', (dialog) => dialog.dismiss())
  await page.getByRole('button', { name: 'Become red spymaster' }).click()
  await expect(page.getByRole('img', { name: 'red spymaster' })).toHaveCount(0)
})

// Stepping down never triggers a dialog, even mid-game.
test('stepping down mid-game needs no confirmation', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()

  await game.giveClue('anchor', 1)

  // No dialog registered — if one fired the test would error.
  await game.releaseSpymaster('red')
  await expect(page.getByRole('img', { name: 'red spymaster' })).toHaveCount(0)
})

// The spymaster picker that used to live in the menu has been removed;
// the header slot replaces it entirely.
test('the menu no longer offers a spymaster seat picker', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()

  await game.openMenu()

  await expect(game.findMenu()).toBeVisible()
  await expect(game.findMenu().getByText("I'm spymaster:")).toHaveCount(0)
})
