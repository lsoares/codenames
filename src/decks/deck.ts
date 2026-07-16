import type { Face } from '../Face'

export interface Deck {
  id: string
  label: string
  icon: string
  description: string
  group: 'words' | 'photos' | 'abstract' | 'symbols' | 'culture'
  difficulty: 'casual' | 'tough' | 'brutal'
  source?: string
  sourceUrl?: string
  fetch: (boardSize?: number) => Promise<Face[]>
}
