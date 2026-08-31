import type { GameState } from './Game'
import { Guest } from './Guest'
import { Host } from './Host'
import type { Session } from './Session'

export class Takeover {
  constructor(
    private readonly peers: readonly string[],
    private readonly selfId: string,
  ) {}

  // Survivors queue up by id; each waits its turn so the first in line wins
  // the room and the rest find it already hosted and rejoin as guests.
  myTurnDelayMs(): number {
    const deadHost = this.peers[0]
    const survivors = this.peers.filter((id) => id !== deadHost).sort()
    const rank = survivors.indexOf(this.selfId)
    return (rank < 0 ? survivors.length : rank) * 1500
  }

  async claim(roomCode: string, state: GameState): Promise<{ session: Session; asHost: boolean }> {
    try {
      return { session: await Host.resume(roomCode, state), asHost: true }
    } catch {
      return { session: await Guest.join(roomCode), asHost: false }
    }
  }
}
