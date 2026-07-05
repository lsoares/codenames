import { test, expect } from '@playwright/test'
import { GamePage, stubUnsplash } from './gamePage'

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
