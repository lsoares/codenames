// How an image face fills its card: plain cover; contain to show the whole image
// at its own ratio (no crop); or cover with a hair of zoom to crop the scanned
// black frame off the official picture cards. Only image faces carry it.
export type CardFit = 'cover' | 'contain' | 'framed'

// A card face, as a deck deals it and the board renders it: a single glyph (an
// emoji or flag, shown big to fill the card), a word (sized to read), a photo, or
// a recolorable svg pictogram. The provider declares which kind it deals, so the
// board renders by `kind` rather than sniffing the string. tooltip is an optional
// hover label — e.g. a flag's country name.
type FaceContent =
  | { readonly kind: 'glyph'; readonly text: string }
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'image'; readonly url: string; readonly fit?: CardFit } // fit defaults to 'cover'
  | { readonly kind: 'icon'; readonly url: string }

export type Face = FaceContent & { readonly tooltip?: string }

export const glyph = (text: string, tooltip?: string): Face => ({ kind: 'glyph', text, tooltip })
export const text = (text: string, tooltip?: string): Face => ({ kind: 'text', text, tooltip })
export const image = (url: string, tooltip?: string, fit?: CardFit): Face => ({ kind: 'image', url, tooltip, fit })
export const icon = (url: string, tooltip?: string): Face => ({ kind: 'icon', url, tooltip })
