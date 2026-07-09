import type { MolesView } from '../multiplayer/Session'
import { MoleGame } from './MoleGame'

export interface MolesWorld {
  thinking(): boolean
  whackerIds(): string[]
  hiddenCardIndices(): number[]
}

export class MolesHost {
  private game: MoleGame | null = null
  private spawner?: ReturnType<typeof setTimeout>
  private readonly lives = new Set<ReturnType<typeof setTimeout>>()
  private nextId = 1

  constructor(
    private readonly world: MolesWorld,
    private readonly broadcast: () => void,
  ) {}

  sync(): void {
    const active = this.world.thinking() && this.world.whackerIds().length >= 2
    if (active && !this.game) {
      this.game = new MoleGame()
      this.schedule()
    } else if (!active && this.game) {
      this.reset()
    }
  }

  whack(peerId: string, moleId: number, reactionMs: number): void {
    if (this.game) this.game = this.game.whack(peerId, moleId, reactionMs)
  }

  view(): MolesView | null {
    return this.game ? { moles: this.game.moles, scores: this.game.scores } : null
  }

  reset(): void {
    this.game = null
    clearTimeout(this.spawner)
    this.lives.forEach(clearTimeout)
    this.lives.clear()
  }

  private schedule(): void {
    clearTimeout(this.spawner)
    this.spawner = setTimeout(() => {
      if (!this.game) return
      const target = Math.min(4, 1 + Math.ceil(this.world.whackerIds().length / 3))
      if (this.game.moles.length < target) this.spawnOne()
      this.schedule()
    }, 500 + Math.random() * 1000)
  }

  private spawnOne(): void {
    if (!this.game) return
    const occupied = new Set(this.game.moles.map((mole) => mole.cardIndex))
    const free = this.world.hiddenCardIndices().filter((index) => !occupied.has(index))
    if (free.length === 0) return
    const from = (['top', 'bottom', 'left', 'right'] as const)[Math.floor(Math.random() * 4)]
    const roll = Math.random()
    const kind = roll < 0.1 ? 'bonus' : roll < 0.35 ? 'decoy' : 'mole'
    const id = this.nextId++
    this.game = this.game.spawn(id, free[Math.floor(Math.random() * free.length)], from, kind)
    this.broadcast()
    const life = setTimeout(() => {
      this.lives.delete(life)
      if (!this.game) return
      this.game = this.game.resolve(id)
      this.broadcast()
      // The +2 rabbit is fugitive: catching it takes a genuinely fast reflex.
    }, kind === 'bonus' ? 1300 : 2200)
    this.lives.add(life)
  }
}
