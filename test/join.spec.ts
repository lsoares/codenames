import { test, expect } from '@playwright/test'
import { GamePage, hostRoom, stubUnsplash } from './gamePage'

test('the homepage join box enters an existing room by its code', async ({ browser }) => {
  const { code } = await hostRoom(browser, 'red')
  const page = await (await browser.newContext()).newPage()
  await stubUnsplash(page)
  const guest = new GamePage(page)
  await guest.open()

  await guest.joinRoomByCode(code)

  await expect(guest.getCards()).toHaveCount(20)
  await expect(page).toHaveURL(new RegExp(`/${code}$`))
})

test('joining a code nobody hosts lets you create the room under it', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('codenames:host-missing-ms', '1500'))
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.openRoom('serao-de-sexta')
  await expect(page.getByRole('heading', { name: 'Codenames Anything' })).toBeVisible()

  await game.createRoom()

  await game.getCards().first().waitFor()
  await expect(page).toHaveURL(/\/serao-de-sexta$/)
})
