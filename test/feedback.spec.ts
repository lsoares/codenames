import { test, expect } from '@playwright/test'
import { GamePage, stubUnsplash } from './gamePage'

// The instant a card is revealed, its guess outcome is flashed over it — a
// bullseye for a hit, a cross for a miss — then it clears so the board settles.
// The host opens already holding the spymaster seat, so it clues straight away.
test('a correct guess flashes a hit that then clears', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()
  const team = await game.getCurrentTurn()
  const target = await game.getCardNumber(team)
  await game.giveClue('signal', 2)

  await game.releaseSpymaster()
  await game.guessNumber(target)

  await expect(game.findFeedback('correct')).toBeVisible()
  await expect(game.findFeedback('correct')).toHaveCount(0)
})

// Guessing the other team's card flashes a miss. Red opens, so blue's cards are
// the wrong ones to pick.
test('a wrong guess flashes a miss', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()
  const target = await game.getCardNumber('blue')
  await game.giveClue('signal', 2)

  await game.releaseSpymaster()
  await game.guessNumber(target)

  await expect(game.findFeedback('wrong')).toBeVisible()
})
