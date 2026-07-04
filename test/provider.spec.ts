import { test, expect } from '@playwright/test'
import { GamePage, stubPexels, stubTmdb } from './gamePage'

test('starting from Curated sources the board from Pexels', async ({ page }) => {
  await stubPexels(page)
  const game = new GamePage(page)
  await game.open()

  const pexelsRequest = page.waitForRequest('**/api.pexels.com/**')
  await game.startWithDeck('Curated')
  await pexelsRequest

  await expect(game.getCards()).toHaveCount(20)
})

test('starting from Movies sources the board from TMDB', async ({ page }) => {
  await stubTmdb(page)
  const game = new GamePage(page)
  await game.open()

  const tmdbRequest = page.waitForRequest('**/api.themoviedb.org/**')
  await game.startWithDeck('Movies')
  await tmdbRequest

  await expect(game.getCards()).toHaveCount(20)
})
