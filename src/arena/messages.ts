import type { Face } from '../Face'
import type { CardColor } from '../Card'
import type { ArenaClue } from './Game'

export interface ArenaScoreEntry {
  id: string
  found: number
  total: number
  dead: boolean
}

export interface ArenaBoard {
  faces: Face[]
  colors: CardColor[]
  deck: string | null
}

export interface ArenaView {
  board: ArenaBoard
  clueHistory: ArenaClue[]
  scoreboard: ArenaScoreEntry[]
  winner: string | null
}

export interface ArenaScoreUpdate {
  __arenaScore: true
  found: number
  dead: boolean
}

export interface ArenaPing {
  __arenaPing: true
}
