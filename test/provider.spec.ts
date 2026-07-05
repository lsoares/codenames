import { test, expect } from '@playwright/test'
import { GamePage, stubCats, stubMixSources, stubPexels, stubTmdb, STUB_WORDS } from './gamePage'

test('the credits area names the selected board type', async ({ page }) => {
  await stubCats(page)
  const game = new GamePage(page)
  await game.open()

  await game.startWithDeck('Cats')
  await game.openToolsMenu()

  await expect(game.getBoardType()).toHaveText('Cats, by The Cat API')
})

test('starting from Curated sources the board from Pexels', async ({ page }) => {
  await stubPexels(page)
  const game = new GamePage(page)
  await game.open()

  const pexelsRequest = page.waitForRequest('**/api.pexels.com/**')
  await game.startWithDeck('Curated')
  await pexelsRequest

  await expect(game.getCards()).toHaveCount(20)
})

test('starting from Mix blends word and photo decks onto one board', async ({ page }) => {
  await stubMixSources(page)
  const game = new GamePage(page)
  await game.open()

  await game.startWithDeck('Mix')

  // Read the board as an operative so cards show bare (no ", colour" suffix); the
  // host auto-seats as red spymaster, so release that seat first — as in Words+.
  await game.releaseSpymaster('red')
  await expect(game.getCards()).not.toHaveCount(0) // image cards from the photo decks
  await expect(
    page.getByRole('button', { name: new RegExp(`^(${STUB_WORDS.join('|')})$`) }).first(),
  ).toBeVisible() // word cards from the word decks
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
