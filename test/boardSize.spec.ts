import { test, expect } from '@playwright/test'
import { GamePage } from './gamePage'

test('selecting 5x5 board size deals the classic 25-card board', async ({ browser }) => {
  const page = await (await browser.newContext()).newPage()
  const game = new GamePage(page)
  await game.open('red')
  await page.getByRole('radiogroup', { name: 'Board size' }).getByText('5x5').click()

  await game.createRoomOnDeck('Words')

  await expect(game.findBoardCards()).toHaveCount(25)
})
