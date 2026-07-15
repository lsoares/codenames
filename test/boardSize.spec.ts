import { test, expect } from '@playwright/test'
import { GamePage } from './gamePage'

test('word decks deal the classic 25-card board', async ({ browser }) => {
  const page = await (await browser.newContext()).newPage()
  const game = new GamePage(page)
  await game.open('red')

  await game.createRoomOnDeck('Words')

  await expect(game.findBoardCards()).toHaveCount(25)
})
