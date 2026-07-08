// How an image face fills its card: plain cover; contain to show the whole image
// at its own ratio (no crop); or cover with a hair of zoom to crop the scanned
// black frame off the official picture cards. Only image faces carry it.
export type CardFit = 'cover' | 'contain' | 'framed'

// A card face, as a deck deals it and the board renders it: a single glyph (an
// emoji or flag, shown big to fill the card), a word (sized to read), a photo, or
// a recolorable svg pictogram. The provider declares which kind it deals, so the
// board renders by `kind` rather than sniffing the string.
type FaceContent =
  | { readonly kind: 'glyph'; readonly text: string }
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'image'; readonly url: string; readonly fit?: CardFit } // fit defaults to 'cover'
  | { readonly kind: 'icon'; readonly url: string }

// tooltip is a hover label (e.g. a flag's country); link is a reference URL the
// card offers via a small ↗ corner icon (e.g. a word's dictionary entry).
export type Face = FaceContent & { readonly tooltip?: string; readonly link?: string }

export const glyph = (text: string, extra: { tooltip?: string } = {}): Face => ({ kind: 'glyph', text, ...extra })
export const text = (text: string, extra: { tooltip?: string; link?: string } = {}): Face => ({ kind: 'text', text, ...extra })
export const image = (url: string, extra: { tooltip?: string; fit?: CardFit; link?: string } = {}): Face => ({ kind: 'image', url, ...extra })
export const icon = (url: string, extra: { tooltip?: string; link?: string } = {}): Face => ({ kind: 'icon', url, ...extra })
