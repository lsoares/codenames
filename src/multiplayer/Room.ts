import type { Team } from '../Game'

// A distinct emoji handed to each player on arrival as their identity. Far larger
// than any real player count, so no two players ever share one.
const emojiPalette = [
  '🦊', '🐸', '🦉', '🐼', '🐧', '🦁', '🐙', '🦄', '🐷', '🐵',
  '🦥', '🦩', '🐢', '🦎', '🐝', '🦖', '🐳', '🦔', '🐰', '🦇',
  '🐨', '🐮', '🐔', '🦆', '🐍', '🐺', '🦂', '🦀', '🐡', '🦑',
  '🐈', '🐕', '🦓', '🦍', '🦌', '🐘', '🦏', '🦛', '🐎', '🐐',
  '🦃', '🦚', '🦜', '🐦', '🦅', '🦢', '🐣', '🦡', '🦨', '🦫',
]

// One spymaster seat per team, by holder id. Null when the chair is open.
export interface Seats {
  readonly red: string | null
  readonly blue: string | null
}

// The lobby as an object: who's on which team, and who holds each spymaster
// seat. Host-side authority, immutable like Game — every operation returns a new
// Room rather than mutating this one.
export class Room {
  constructor(
    private readonly teamOf: Readonly<Record<string, Team>> = {},
    private readonly seatOf: Seats = { red: null, blue: null },
    private readonly emojiOf: Readonly<Record<string, string>> = {},
  ) {}

  get teams(): Record<string, Team> {
    return { ...this.teamOf }
  }

  get seats(): Seats {
    return { red: this.seatOf.red, blue: this.seatOf.blue }
  }

  // Each player's identity emoji, by holder id — stable for the session and
  // independent of team, so switching sides keeps it.
  get emojis(): Record<string, string> {
    return { ...this.emojiOf }
  }

  // Auto-assign each peer to a team on arrival, then leave it fixed. Fill the two
  // spymaster chairs first (red, then blue) so the first two players become the
  // two spymasters — even after one leaves an empty chair; only once both are
  // seated do further arrivals balance out as operatives.
  assignTeam(peerId: string): Room {
    if (this.teamOf[peerId]) return this
    return new Room({ ...this.teamOf, [peerId]: this.teamForArrival() }, this.seatOf, this.emojiOf)
  }

  // Give an arriving peer the first palette emoji nobody else holds. Keyed by
  // peer, not team, so it outlives team switches; released again on drop.
  assignEmoji(peerId: string): Room {
    if (this.emojiOf[peerId]) return this
    const used = new Set(Object.values(this.emojiOf))
    const free = emojiPalette.find((emoji) => !used.has(emoji)) ?? '👤'
    return new Room(this.teamOf, this.seatOf, { ...this.emojiOf, [peerId]: free })
  }

  private teamForArrival(): Team {
    if (!this.seatOf.red) return 'red'
    if (!this.seatOf.blue) return 'blue'
    const red = Object.values(this.teamOf).filter((t) => t === 'red').length
    const blue = Object.values(this.teamOf).filter((t) => t === 'blue').length
    return red <= blue ? 'red' : 'blue'
  }

  // A player overriding their auto-assigned team, as an operative. Dropping to an
  // operative on the new side means giving up any spymaster seat first.
  setTeam(peerId: string, team: Team): Room {
    return new Room({ ...this.teamOf, [peerId]: team }, this.without(peerId), this.emojiOf)
  }

  // One holder per team, one seat per peer. Anyone can take a seat at any time,
  // stealing it from whoever holds it — the role isn't locked once the game
  // starts, so players can freely swap into the spymaster chair.
  claimSeat(peerId: string, team: Team | null): Room {
    const freed = this.without(peerId)
    return new Room(this.teamOf, team ? { ...freed, [team]: peerId } : freed, this.emojiOf)
  }

  // A joiner takes their team's spymaster seat if it's still open, so nobody has
  // to claim it by hand; a seat that's already held is left untouched.
  autoSeat(peerId: string): Room {
    const team = this.teamOf[peerId]
    if (!team || this.seatOf[team]) return this
    return new Room(this.teamOf, { ...this.seatOf, [team]: peerId }, this.emojiOf)
  }

  // A peer leaving: free its seat and forget its team.
  drop(peerId: string): Room {
    const { [peerId]: _gone, ...rest } = this.teamOf
    const { [peerId]: _emoji, ...emojiRest } = this.emojiOf
    return new Room(rest, this.without(peerId), emojiRest)
  }

  // Free any spymaster seat whose holder is no longer present. A seat can
  // outlive its holder when this host never tracked their departure — e.g. after
  // a FIFO takeover the new host inherits the game but not the old connections,
  // so a seat left by the previous spymaster would otherwise stay "taken"
  // forever, leaving the team unable to re-seat mid-game. Returns this unchanged
  // when every held seat is still present, so callers can skip a broadcast.
  freeAbsentSeats(present: ReadonlySet<string>): Room {
    const held = (id: string | null) => id !== null && !present.has(id)
    if (!held(this.seatOf.red) && !held(this.seatOf.blue)) return this
    return new Room(
      this.teamOf,
      {
        red: held(this.seatOf.red) ? null : this.seatOf.red,
        blue: held(this.seatOf.blue) ? null : this.seatOf.blue,
      },
      this.emojiOf,
    )
  }

  // Release whichever seat this peer holds, leaving the other team's untouched.
  private without(peerId: string): Seats {
    return {
      red: this.seatOf.red === peerId ? null : this.seatOf.red,
      blue: this.seatOf.blue === peerId ? null : this.seatOf.blue,
    }
  }
}
