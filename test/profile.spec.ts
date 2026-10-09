import { test, expect } from '@playwright/test'
import { GamePage, joinRoom, stubUnsplash } from './gamePage'

test('players keep their chosen name and emoji beside the board', async ({ browser }) => {
  const host = new GamePage(await (await browser.newContext()).newPage())
  await host.open('red', { name: 'Ana', emoji: '🦉' })
  await host.createRoom()
  const code = await host.getRoomCode()
  const guestPage = await (await browser.newContext()).newPage()
  await stubUnsplash(guestPage)
  const guest = new GamePage(guestPage)

  await guest.openRoom(code, 'blue', { name: 'Bruno', emoji: '🐙' })

  await expect(host.getTeamPlayers('red')).toHaveText(['🦉Ana🕵️‍♀️'])
  await expect(host.getTeamPlayers('blue')).toHaveText(['🐙Bruno🕵️‍♂️'])
})

test('a name is capped at 14 characters', async ({ page }) => {
  await page.goto('/')
  const game = new GamePage(page)

  await game.typeName('Maximiliano Oliveira')

  await expect(game.getNameInput()).toHaveValue('Maximiliano Ol')
})

test("operatives see their spymaster's name while a clue is pending", async ({ browser }) => {
  const host = new GamePage(await (await browser.newContext()).newPage())
  await host.open('red', { name: 'Ana', emoji: '🦉' })
  await host.createRoom()
  const code = await host.getRoomCode()
  await joinRoom(browser, code, 'blue')
  await joinRoom(browser, code, 'blue')

  const operative = await joinRoom(browser, code, 'red')

  await expect(operative.findStatus('Ana is thinking…')).toBeVisible()
})
