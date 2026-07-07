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

  // Auto-assign each peer to a team on arrival, then leave it fixed: the smaller
  // team, or — when they're even — the preferred side if one is given, else a coin
  // toss. The very first player is handed the starting team (passed as preferred)
  // so they can start planning the opening clue right away. The first player to
  // land on a side becomes its spymaster via autoSeat.
  assignTeam(peerId: string, preferred?: Team): Room {
    if (this.teamOf[peerId]) return this
    return new Room(
      { ...this.teamOf, [peerId]: this.teamForArrival(preferred) },
      this.seatOf,
      this.emojiOf,
    )
  }

  // Give an arriving peer the first palette emoji nobody else holds. Keyed by
  // peer, not team, so it outlives team switches; released again on drop.
  assignEmoji(peerId: string): Room {
    if (this.emojiOf[peerId]) return this
    const used = new Set(Object.values(this.emojiOf))
    const free = emojiPalette.find((emoji) => !used.has(emoji)) ?? '👤'
    return new Room(this.teamOf, this.seatOf, { ...this.emojiOf, [peerId]: free })
  }

  private teamForArrival(preferred?: Team): Team {
    const red = Object.values(this.teamOf).filter((t) => t === 'red').length
    const blue = Object.values(this.teamOf).filter((t) => t === 'blue').length
    if (red !== blue) return red < blue ? 'red' : 'blue'
    return preferred ?? (Math.random() < 0.5 ? 'red' : 'blue')
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

  // Auto-promote a present member to any spymaster seat left empty, so a team
  // that still has players is never leaderless — e.g. after its spymaster drops
  // mid-game, or steps aside pre-game. Picks the earliest-known member; returns
  // this unchanged when nothing needs filling, so callers can skip a broadcast.
  fillEmptySeats(present: ReadonlySet<string>): Room {
    const firstPresent = (team: Team) =>
      Object.keys(this.teamOf).find((id) => this.teamOf[id] === team && present.has(id)) ?? null
    const red = this.seatOf.red ?? firstPresent('red')
    const blue = this.seatOf.blue ?? firstPresent('blue')
    if (red === this.seatOf.red && blue === this.seatOf.blue) return this
    return new Room(this.teamOf, { red, blue }, this.emojiOf)
  }

  // Pass each team's spymaster seat to the next member in arrival order, so a new
  // game gives everyone a turn at the role. A team with one member (or none)
  // keeps its seat.
  rotateSpymasters(): Room {
    const rotated = (team: Team): string | null => {
      const holder = this.seatOf[team]
      if (holder === null) return null
      const members = Object.keys(this.teamOf).filter((id) => this.teamOf[id] === team)
      if (members.length < 2) return holder
      return members[(members.indexOf(holder) + 1) % members.length]
    }
    return new Room(this.teamOf, { red: rotated('red'), blue: rotated('blue') }, this.emojiOf)
  }

  // Release whichever seat this peer holds, leaving the other team's untouched.
  private without(peerId: string): Seats {
    return {
      red: this.seatOf.red === peerId ? null : this.seatOf.red,
      blue: this.seatOf.blue === peerId ? null : this.seatOf.blue,
    }
  }
}
