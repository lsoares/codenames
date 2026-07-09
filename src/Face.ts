export type CardFit = 'cover' | 'contain' | 'framed'

type FaceContent =
  | { readonly kind: 'glyph'; readonly text: string }
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'image'; readonly url: string; readonly fit?: CardFit }
  | { readonly kind: 'icon'; readonly url: string }

export type Face = FaceContent & { readonly tooltip?: string; readonly link?: string }

export const glyph = (text: string, extra: { tooltip?: string } = {}): Face => ({ kind: 'glyph', text, ...extra })
export const text = (text: string, extra: { tooltip?: string; link?: string } = {}): Face => ({ kind: 'text', text, ...extra })
export const image = (url: string, extra: { tooltip?: string; fit?: CardFit; link?: string } = {}): Face => ({ kind: 'image', url, ...extra })
export const icon = (url: string, extra: { tooltip?: string; link?: string } = {}): Face => ({ kind: 'icon', url, ...extra })
