import { test, expect } from '@playwright/test'
import { GamePage, stubUnsplash, stubPexels, stubTmdb } from './gamePage'

test('choosing Pexels sources the next game from Pexels', async ({ page }) => {
  await stubUnsplash(page)
  await stubPexels(page)
  const game = new GamePage(page)

  await game.open()
  await game.createRoom()

  const pexelsRequest = page.waitForRequest('**/api.pexels.com/**')
  await game.startGameWithSource('Pexels')
  await pexelsRequest

  await expect(game.getCards()).toHaveCount(20)
})

test('choosing Movies sources the next game from TMDB', async ({ page }) => {
  await stubUnsplash(page)
  await stubTmdb(page)
  const game = new GamePage(page)

  await game.open()
  await game.createRoom()

  const tmdbRequest = page.waitForRequest('**/api.themoviedb.org/**')
  await game.startGameWithSource('Movies')
  await tmdbRequest

  await expect(game.getCards()).toHaveCount(20)
})
