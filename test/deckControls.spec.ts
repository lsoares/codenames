import { test, expect } from '@playwright/test'
import { hostRoom, joinRoom } from './gamePage'

// Starting a new game on a fresh deck is a spymaster's call, so only a
// spymaster gets the bottom-left deck-picker button.
test('an operative has no deck-picker button', async ({ browser }) => {
  const { code } = await hostRoom(browser, 'red')
  const operative = await joinRoom(browser, code, 'red')

  await expect(operative.findDeckPickerButton()).toHaveCount(0)
})

test('a spymaster has the deck-picker button', async ({ browser }) => {
  const { game: spymaster } = await hostRoom(browser, 'red')

  await expect(spymaster.findDeckPickerButton()).toBeVisible()
})

// The picker keeps the room: while the spymaster is over on the deck grid, the
// other players are told in the banner that a new deck is being chosen.
test('choosing a new deck tells the other players in the banner', async ({ browser }) => {
  const { game: spymaster, code } = await hostRoom(browser, 'red')
  const other = await joinRoom(browser, code, 'blue')

  await spymaster.openDeckPicker()

  await expect(other.findRepickNotice()).toBeVisible()
})
