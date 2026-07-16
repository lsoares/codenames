import { test, expect } from '@playwright/test'
import { hostRoom, joinRoom } from './gamePage'

test('revealing the assassin ends the game and lays the whole board face-up', async ({
  browser,
}) => {
  const { game: spymaster, code } = await hostRoom(browser, 'red')
  const operative = await joinRoom(browser, code, 'red')

  const target = await spymaster.getCardNumber('assassin')
  await spymaster.giveClue('trap', 1)

  await operative.guessNumber(target)

  await expect(operative.getWinBadge('blue')).toBeVisible()
  // The finish reveals the whole key to everyone — even the operative, who never
  // saw a colour, now sees all 20 cards face-up.
  await expect(operative.findRevealedCards()).toHaveCount(20)
})

test('a full game — cap runs out, misses on neutral and enemy, red then wins', async ({
  browser,
}) => {
  const { game: redSpy, code } = await hostRoom(browser, 'red')
  // Four fixed seats — a spymaster and an operative per team — so every turn is
  // played by its own tabs, no mid-game switching. The red spymaster sees every
  // colour, so note the cards up front.
  const redOp = await joinRoom(browser, code, 'red')
  const blueSpy = await joinRoom(browser, code, 'blue')
  const blueOp = await joinRoom(browser, code, 'blue')
  await expect(redSpy.findBoardCards()).toHaveCount(20)
  const reds = await redSpy.getCardNumbers('red')
  const blues = await redSpy.getCardNumbers('blue')
  const neutrals = await redSpy.getCardNumbers('neutral')

  // Operatives have no clue controls; the off-turn spymaster has no clue button.
  await expect(redOp.findGiveClueButton()).toHaveCount(0)
  await expect(blueSpy.findGiveClueButton()).toHaveCount(0)

  // Red: a clue for 1 grants two guesses; one right, then pass — the voluntary
  // pass hands the turn to blue without missing.
  await redSpy.giveClue('reds', 1)

  // The tally includes the bonus guess beyond the clue count.
  await expect(redOp.findGuessTally()).toHaveAccessibleName('0 used out of 2')
  // After a clue, the operative cannot pass before making at least one guess.
  await expect(redOp.findPassButton()).toHaveCount(0)

  await redOp.guessNumber(reds[0])
  // A correct guess flashes a hit to the guesser, and the reveal syncs to the
  // other tabs (the blue spymaster sees the same card turn over).
  await expect(redOp.findFeedback('correct')).toBeVisible()
  // After at least one guess, the operative can pass.
  await expect(redOp.findPassButton()).toBeVisible()
  await expect(blueSpy.getCard('red', { revealed: true }).first()).toBeVisible()
  await redOp.pass()
  await expect.poll(() => redSpy.getCurrentTurn()).toBe('blue')

  // Blue: one right, then a neutral — the miss hands the turn back to red.
  await blueSpy.giveClue('blues', 0)
  await blueOp.guessNumber(blues[0])
  await blueOp.guessNumber(neutrals[0])
  await expect.poll(() => redSpy.getCurrentTurn()).toBe('red')

  // Red: one right, then an enemy (blue) card — the miss flashes a miss and
  // passes the turn to blue.
  await redSpy.giveClue('more', 0)
  await redOp.guessNumber(reds[1])
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
  const rest = reds.slice(2)
  for (const n of rest.slice(0, -1)) await redOp.guessNumber(n)

  await redOp.guessNumber(rest[rest.length - 1])

  await expect(redSpy.getWinBadge('red')).toBeVisible()
  // After a win, no more clues or guesses are possible.
  await expect(redSpy.findGiveClueButton()).toHaveCount(0)
  await expect(redOp.findPassButton()).toHaveCount(0)
  // At game end each side lists the clues that team gave, in order.
  await expect(redSpy.getTeamClues('red')).toHaveText([/reds/, /more/, /rest/])
  await expect(redSpy.getTeamClues('blue')).toHaveText([/blues/, /again/])
})
