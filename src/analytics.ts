import posthog from 'posthog-js'

const enabled =
  new URLSearchParams(location.search).has('ph') ||
  !['localhost', '127.0.0.1'].includes(location.hostname)

if (enabled) {
  posthog.init('phc_rJvaD22rtzcewWk3KPrZoXNWXgNUV2pEprtHbezCQYzK', {
    api_host: 'https://eu.i.posthog.com',
    person_profiles: 'always',
  })
}

export function identify(roomCode: string, emoji: string): void {
  if (enabled) posthog.identify(`${roomCode} ${emoji}`)
}

export function track(event: string, props?: Record<string, unknown>): void {
  if (enabled) posthog.capture(event, props)
}
