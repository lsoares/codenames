import type { Face } from '../Face'
import type { CardColor } from '../Card'
import type { ArenaClue } from './Game'

export interface ArenaScoreEntry {
  id: string
  emoji: string
  found: number
  total: number
  dead: boolean
  timeMs: number
}

export interface ArenaBoard {
  faces: Face[]
  colors: CardColor[]
  deck: string | null
}

export interface ArenaView {
  board: ArenaBoard
  scoreboard: ArenaScoreEntry[]
  winner: string | null
}

export interface ArenaClueRequest {
  __clueRequest: true
  mineWords: string[]
}

export interface ArenaClueResponse {
  __clueResponse: true
  clue: ArenaClue
}

export interface ArenaScoreUpdate {
  __arenaScore: true
  found: number
  dead: boolean
  timeMs: number
}

export interface ArenaPing {
  __arenaPing: true
}
