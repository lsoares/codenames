import { test, expect } from '@playwright/test'
import { GamePage } from './gamePage'

function stubGroqApi(page: import('@playwright/test').Page, responses: { word: string; count: number }[]) {
  let callIndex = 0
  return page.route('**/api.groq.com/**', (route) => {
    const response = responses[callIndex] ?? responses[responses.length - 1]
    callIndex++
    return route.fulfill({
      json: {
        choices: [{ message: { content: JSON.stringify(response) } }],
      },
    })
  })
}

test('practice: AI gives a clue and the player guesses a card', async ({ page }) => {
  const game = new GamePage(page)
  await stubGroqApi(page, [{ word: 'NATURE', count: 1 }])

  await game.open()
  await game.clickPractice()
  await game.saveApiKey()

  await expect(page.getByText('NATURE')).toBeVisible()
  const firstWord = await page.locator('[class*="board"] button:not([disabled])').first().innerText()

  await page.getByRole('button', { name: firstWord, exact: true }).click()

  await expect(
    page.getByRole('img', { name: 'correct guess' })
      .or(page.getByRole('img', { name: 'assassin' }))
  ).toBeVisible()
})

test('practice: setup screen appears when no API key is configured', async ({ page }) => {
  const game = new GamePage(page)
  await game.open()
  await game.clickPractice()

  await expect(page.getByRole('textbox', { name: 'API key' })).toBeVisible()
  await expect(page.getByText('Create a Groq API key')).toBeVisible()
})
