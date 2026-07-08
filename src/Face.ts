// A card face, as a deck deals it and the board renders it: a single glyph (an
// emoji or flag, shown big to fill the card), a word (sized to read), a photo, or
// a recolorable svg pictogram. The provider declares which kind it deals, so the
// board renders by `kind` rather than sniffing the string. tooltip is an optional
// hover label — e.g. a flag's country name.
type FaceContent =
  | { readonly kind: 'glyph'; readonly text: string }
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'image'; readonly url: string }
  | { readonly kind: 'icon'; readonly url: string }

export type Face = FaceContent & { readonly tooltip?: string }

export const glyph = (text: string, tooltip?: string): Face => ({ kind: 'glyph', text, tooltip })
export const text = (text: string, tooltip?: string): Face => ({ kind: 'text', text, tooltip })
export const image = (url: string, tooltip?: string): Face => ({ kind: 'image', url, tooltip })
export const icon = (url: string, tooltip?: string): Face => ({ kind: 'icon', url, tooltip })
