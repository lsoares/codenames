import type { Face } from '../Face'
import type { Composition } from '../Game'

export interface Deck {
  id: string
  label: string
  icon: string
  description: string
  group: 'words' | 'photos' | 'abstract' | 'symbols' | 'culture'
  difficulty: 'casual' | 'tough' | 'brutal'
  source?: string
  sourceUrl?: string
  composition?: Composition
  fetch: () => Promise<Face[]>
}
