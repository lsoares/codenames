import { test, expect } from '@playwright/test'
import { hostRoom, joinRoom } from './gamePage'

test('operatives cannot pass before making a guess', async ({ browser }) => {
  const { game: spymaster, code } = await hostRoom(browser, 'red')
  const operative = await joinRoom(browser, code, 'red')

  await spymaster.giveClue('start', 2)

  await expect(operative.findPassButton()).toBeHidden()
})

test('a guess unlocks the Pass button', async ({ browser }) => {
  const { game: spymaster, code } = await hostRoom(browser, 'red')
  const operative = await joinRoom(browser, code, 'red')
  const reds = await spymaster.getCardNumbers('red')
  await spymaster.giveClue('start', 2)

  await operative.guessNumber(reds[0])

  await expect(operative.findPassButton()).toBeVisible()
})

test('passing after a guess hands the turn to the other team', async ({ browser }) => {
  const { game: spymaster, code } = await hostRoom(browser, 'red')
  const operative = await joinRoom(browser, code, 'red')
  const reds = await spymaster.getCardNumbers('red')
  await spymaster.giveClue('start', 2)
  await operative.guessNumber(reds[0])

  await operative.pass()

  await expect.poll(() => spymaster.getCurrentTurn()).toBe('blue')
})
