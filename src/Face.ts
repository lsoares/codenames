export const getDefinitionUrl = (word: string): string =>
  `https://www.dictionary.com/browse/${encodeURIComponent(word.toLowerCase())}`

export type CardFit = 'cover' | 'contain' | 'framed'

export type Face = FaceContent & { readonly tooltip?: string; readonly link?: string }

type FaceContent =
  | { readonly kind: 'glyph'; readonly text: string }
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'image'; readonly url: string; readonly fit?: CardFit; readonly trim?: number }
  | { readonly kind: 'icon'; readonly url: string }
