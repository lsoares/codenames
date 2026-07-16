import type { Face } from '../Face'

export interface Deck {
  title: string
  icon: string
  description: string
  category: 'words' | 'photos' | 'abstract' | 'symbols' | 'culture'
  difficulty: 'casual' | 'tough' | 'brutal'
  source?: string
  sourceUrl?: string
  fetch: (boardSize?: number) => Promise<Face[]>
}
