import { test, expect } from '@playwright/test'
import { GamePage } from './gamePage'

test('a clue may not be a word shown on the table', async ({ browser }) => {
  const page = await (await browser.newContext()).newPage()
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoomOnDeck('Words')
  const onTable = await game.readAVisibleWord()
  await game.getClueInput().fill(onTable)

  await game.findGiveClueButton().click()

  await expect(game.getClueInput()).toHaveValue(onTable)
})
