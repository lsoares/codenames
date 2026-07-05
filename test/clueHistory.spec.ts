import { test, expect } from '@playwright/test'
import { GamePage, stubUnsplash } from './gamePage'

test('at game end each side shows the clues that team gave', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()
  const target = await game.getCardNumber('assassin')
  await game.giveClue('trap', 1)
  await game.releaseSpymaster()

  await game.guessNumber(target)

  await expect(game.getTeamClues('red')).toHaveText([/trap/])
  await expect(game.getTeamClues('blue')).toHaveText(['—'])
})

test('the clue word is capped at 20 characters', async ({ page }) => {
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.open('red')
  await game.createRoom()

  await game.typeClueWord('a'.repeat(25))

  await expect(game.getClueInput()).toHaveValue('a'.repeat(20))
})
