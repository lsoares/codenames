export type MoleDirection = 'top' | 'bottom' | 'left' | 'right'
export type MoleKind = 'mole' | 'decoy' | 'bonus'

export interface MoleSighting {
  readonly id: number
  readonly cardIndex: number
  readonly from: MoleDirection
  readonly kind: MoleKind
}

export class MoleGame {
  constructor(
    readonly moles: readonly MoleSighting[] = [],
    private readonly whacks: Readonly<Record<number, Readonly<Record<string, number>>>> = {},
    readonly scores: Readonly<Record<string, number>> = {},
  ) {}

  spawn(id: number, cardIndex: number, from: MoleDirection, kind: MoleKind): MoleGame {
    return new MoleGame([...this.moles, { id, cardIndex, from, kind }], this.whacks, this.scores)
  }

  whack(peerId: string, moleId: number, reactionMs: number): MoleGame {
    if (!this.moles.some((mole) => mole.id === moleId)) return this
    const forMole = this.whacks[moleId] ?? {}
    if (peerId in forMole) return this
    return new MoleGame(
      this.moles,
      { ...this.whacks, [moleId]: { ...forMole, [peerId]: reactionMs } },
      this.scores,
    )
  }

  resolve(moleId: number): MoleGame {
    const resolved = this.moles.find((mole) => mole.id === moleId)
    const remaining = this.moles.filter((mole) => mole.id !== moleId)
    const { [moleId]: forMole, ...rest } = this.whacks
    const fastest = Object.entries(forMole ?? {}).sort((a, b) => a[1] - b[1])[0]
    if (!fastest) return new MoleGame(remaining, rest, this.scores)
    const score = this.scores[fastest[0]] ?? 0
    return new MoleGame(remaining, rest, {
      ...this.scores,
      [fastest[0]]:
        resolved?.kind === 'decoy'
          ? Math.max(0, score - 2)
          : score + (resolved?.kind === 'bonus' ? 2 : 1),
    })
  }
}
