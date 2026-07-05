import { test, expect } from '@playwright/test'
import { GamePage, stubUnsplash } from './gamePage'

test('the room QR opens in a dialog', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()

  await game.openRoomQr()

  await expect(game.getRoomQrDialog()).toBeVisible()
})

test('clicking the QR copies the join link', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()
  await game.openRoomQr()

  await game.copyRoomLink()

  await expect(game.getRoomQrDialog().getByText('Copied!')).toBeVisible()
})

test('Escape closes the room QR dialog', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()
  await game.openRoomQr()

  await page.keyboard.press('Escape')

  await expect(game.getRoomQrDialog()).toBeHidden()
})
