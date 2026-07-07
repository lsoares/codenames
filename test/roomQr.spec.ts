import { test, expect } from '@playwright/test'
import { GamePage, stubUnsplash } from './gamePage'

test('the tools menu shows the room join link', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()

  await game.openToolsMenu()

  await expect(game.getJoinLinkButton()).toBeVisible()
})

test('clicking the room name copies the join link', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()
  await game.openToolsMenu()

  await game.copyRoomLink()

  await expect(game.getCopiedNote()).toBeVisible()
})
