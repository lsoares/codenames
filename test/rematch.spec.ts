import { test, expect } from '@playwright/test'
import { hostRoom, joinRoom } from './gamePage'

// When the game ends, Change deck returns to the deck grid in the same room:
// picking a deck re-deals for everyone, and the win badge is gone.
test('after a win, changing deck deals a fresh board in the same room', async ({ browser }) => {
  const { game: host, code } = await hostRoom(browser, 'red')
  const operative = await joinRoom(browser, code, 'red')
  const target = await host.getCardNumber('assassin')
  await host.giveClue('trap', 1)
  await operative.guessNumber(target)
  await expect(host.getWinBadge('blue')).toBeVisible()

  await host.openChangeDeck()
  await host.showMoreDecks()
  await host.pickDeckFromGrid('Random')

  await expect(host.getWinBadge('blue')).toHaveCount(0)
  await expect(host.getCards()).toHaveCount(20)
})
