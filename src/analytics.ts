import posthog from 'posthog-js'

const enabled =
  new URLSearchParams(location.search).has('ph') ||
  !['localhost', '127.0.0.1'].includes(location.hostname)

if (enabled) {
  posthog.init('phc_zec9QTGoVEc8SxHiZ9PfJTHNJfxcvZA6SpeEvfGWCjMB', {
    api_host: 'https://us.i.posthog.com',
    person_profiles: 'always',
  })
}

export function track(event: string, props?: Record<string, unknown>): void {
  if (enabled) posthog.capture(event, props)
}
