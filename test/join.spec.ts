import { test, expect } from '@playwright/test'

// A dead code must not be blamed on the network: the join retries for its
// window (shrunk here so the test doesn't sit through the real 15s — but kept
// above the broker's ~5s grace before it reports a peer as missing), then
// reports the room itself as gone, with a way back to the homepage.
test('joining a room nobody hosts says the room was not found', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('codenames:join-window-ms', '7000'))
  await page.goto('/#nosuchroom')

  await expect(page.getByRole('status')).toHaveText('Connecting…')
  await expect(page.getByRole('status')).toContainText('Could not find the room')

  await page.getByRole('button', { name: 'Back to home' }).click()
  await expect(page.getByRole('heading', { name: 'Codenames Anything' })).toBeVisible()
})
