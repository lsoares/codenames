import { test, expect } from '@playwright/test'
import { GamePage, stubUnsplash } from './gamePage'

test('browser back leaves a game for the homepage', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open()
  await game.createRoom()

  await page.goBack()

  await expect(page.getByRole('heading', { name: 'Codenames Anything' })).toBeVisible()
})

test('browser back from the deck picker returns to the game, keeping the room', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open()
  await game.createRoom()
  await game.openDeckPicker()

  await page.goBack()

  await expect(game.getCards().first()).toBeVisible()
})

// The spymaster may have cards highlighted (which hold their own back-to-cancel
// history entry) when they open the deck picker; back must still keep the room.
test('browser back from the deck picker keeps the room with a card selected', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open()
  await game.createRoom()
  await game.getCards().first().click()
  await game.openDeckPicker()

  await page.goBack()

  await expect(game.getCards().first()).toBeVisible()
})
