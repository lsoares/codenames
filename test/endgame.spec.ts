import { test, expect, type Browser } from '@playwright/test'
import { GamePage, stubUnsplash } from './gamePage'

// A tab on its own team: opens a page, stubs the board source, returns its driver.
async function joinAs(browser: Browser, code: string, team: 'red' | 'blue'): Promise<GamePage> {
  const page = await (await browser.newContext()).newPage()
  await stubUnsplash(page)
  const game = new GamePage(page)
  await game.openRoom(code, team)
  await game.getCards().first().waitFor()
  return game
}

test('revealing the assassin ends the game for the other team', async ({ browser }) => {
  const hostPage = await (await browser.newContext()).newPage()
  await stubUnsplash(hostPage)
  const spymaster = new GamePage(hostPage)
  await spymaster.open('red')
  await spymaster.createRoom()
  const code = await spymaster.getRoomCode()
  const operative = await joinAs(browser, code, 'red')

  const target = await spymaster.getCardNumber('assassin')
  await spymaster.giveClue('trap', 1)

  await operative.guessNumber(target)

  await expect(operative.getWinBadge('blue')).toBeVisible()
})

test('a full game — cap runs out, misses on neutral and enemy, red then wins', async ({ browser }) => {
  const hostPage = await (await browser.newContext()).newPage()
  await stubUnsplash(hostPage)
  const redSpy = new GamePage(hostPage)
  await redSpy.open('red')
  await redSpy.createRoom()
  const code = await redSpy.getRoomCode()
  // Four fixed seats — a spymaster and an operative per team — so every turn is
  // played by its own tabs, no mid-game switching. The red spymaster sees every
  // colour, so note the cards up front.
  const redOp = await joinAs(browser, code, 'red')
  const blueSpy = await joinAs(browser, code, 'blue')
  const blueOp = await joinAs(browser, code, 'blue')
  const reds = await redSpy.getCardNumbers('red')
  const blues = await redSpy.getCardNumbers('blue')
  const neutrals = await redSpy.getCardNumbers('neutral')

  // Red: a clue for 1 grants two guesses; two right in a row spend them, so the
  // turn passes to blue on a hit — not a miss.
  await redSpy.giveClue('reds', 1)
  await redOp.guessNumber(reds[0])
  // A correct guess flashes a hit to the guesser, and the reveal syncs to the
  // other tabs (the blue spymaster sees the same card turn over).
  await expect(redOp.findFeedback('correct')).toBeVisible()
  await expect(blueSpy.getCard('red', { revealed: true }).first()).toBeVisible()
  await redOp.guessNumber(reds[1])
  await expect.poll(() => redSpy.getCurrentTurn()).toBe('blue')

  // Blue: one right, then a neutral — the miss hands the turn back to red.
  await blueSpy.giveClue('blues', 0)
  await blueOp.guessNumber(blues[0])
  await blueOp.guessNumber(neutrals[0])
  await expect.poll(() => redSpy.getCurrentTurn()).toBe('red')

  // Red: one right, then an enemy (blue) card — the miss flashes a miss and
  // passes the turn to blue.
  await redSpy.giveClue('more', 0)
  await redOp.guessNumber(reds[2])
  await redOp.guessNumber(blues[1])
  await expect(redOp.findFeedback('wrong')).toBeVisible()
  await expect.poll(() => redSpy.getCurrentTurn()).toBe('blue')

  // Blue: one right, then a neutral — back to red for the finish.
  await blueSpy.giveClue('again', 0)
  await blueOp.guessNumber(blues[2])
  await blueOp.guessNumber(neutrals[1])
  await expect.poll(() => redSpy.getCurrentTurn()).toBe('red')

  // Red again: clear the rest; the last red card wins it.
  await redSpy.giveClue('rest', 0)
  const rest = reds.slice(3)
  for (const n of rest.slice(0, -1)) await redOp.guessNumber(n)

  await redOp.guessNumber(rest[rest.length - 1])

  await expect(redSpy.getWinBadge('red')).toBeVisible()
  // At game end each side lists the clues that team gave, in order.
  await expect(redSpy.getTeamClues('red')).toHaveText([/reds/, /more/, /rest/])
  await expect(redSpy.getTeamClues('blue')).toHaveText([/blues/, /again/])
})
