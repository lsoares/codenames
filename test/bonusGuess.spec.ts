import { test, expect } from '@playwright/test'
import { hostRoom, joinRoom } from './gamePage'

test('operatives see the bonus guess beyond the clue number', async ({ browser }) => {
  const { game: spymaster, code } = await hostRoom(browser, 'red')
  const operative = await joinRoom(browser, code, 'red')

  await spymaster.giveClue('start', 2)

  await expect(operative.findGuessTally()).toHaveAccessibleName('0 used out of 3')
})
