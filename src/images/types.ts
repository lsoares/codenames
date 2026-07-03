// An image source for the picture board. `fetch` resolves to 20 image URLs, or
// throws when it can't (missing key, network error) so callers can fall back.
export interface ImageProvider {
  id: string
  label: string
  fetch: () => Promise<string[]>
}
