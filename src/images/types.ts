// A source of card faces. `fetch` resolves to 20 faces — image URLs for
// `kind: 'image'` providers, or words for `kind: 'word'` — or throws when it
// can't (missing key, network error) so callers can fall back.
export interface CardProvider {
  id: string
  label: string
  kind: 'image' | 'word'
  fetch: () => Promise<string[]>
}
