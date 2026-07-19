import type { Team } from './Game'

export interface Seats {
  readonly red: string | null
  readonly blue: string | null
}

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

  get emojis(): Record<string, string> {
    return { ...this.emojiOf }
  }

  assignTeam(peerId: string): Room {
    if (this.teamOf[peerId]) return this
    return new Room({ ...this.teamOf, [peerId]: this.teamForArrival() }, this.seatOf, this.emojiOf)
  }

  assignEmoji(peerId: string): Room {
    if (this.emojiOf[peerId]) return this
    const used = new Set(Object.values(this.emojiOf))
    const free = emojiPalette.find((emoji) => !used.has(emoji)) ?? '👤'
    return new Room(this.teamOf, this.seatOf, { ...this.emojiOf, [peerId]: free })
  }

  private teamForArrival(): Team {
    const teams = Object.values(this.teamOf)
    const red = teams.filter((t) => t === 'red').length
    const blue = teams.filter((t) => t === 'blue').length
    if (red + blue === 1) return red === 1 ? 'red' : 'blue'
    if (red !== blue) return red < blue ? 'red' : 'blue'
    return Math.random() < 0.5 ? 'red' : 'blue'
  }

  setTeam(peerId: string, team: Team): Room {
    return new Room({ ...this.teamOf, [peerId]: team }, this.without(peerId), this.emojiOf)
  }

  claimSeat(peerId: string, team: Team | null): Room {
    const freed = this.without(peerId)
    return new Room(this.teamOf, team ? { ...freed, [team]: peerId } : freed, this.emojiOf)
  }

  autoSeat(peerId: string): Room {
    const team = this.teamOf[peerId]
    if (!team || this.seatOf[team]) return this
    return new Room(this.teamOf, { ...this.seatOf, [team]: peerId }, this.emojiOf)
  }

  drop(peerId: string): Room {
    const { [peerId]: _gone, ...rest } = this.teamOf
    const { [peerId]: _emoji, ...emojiRest } = this.emojiOf
    return new Room(rest, this.without(peerId), emojiRest)
  }

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

  fillEmptySeats(present: ReadonlySet<string>): Room {
    const firstPresent = (team: Team) =>
      Object.keys(this.teamOf).find((id) => this.teamOf[id] === team && present.has(id)) ?? null
    const red = this.seatOf.red ?? firstPresent('red')
    const blue = this.seatOf.blue ?? firstPresent('blue')
    if (red === this.seatOf.red && blue === this.seatOf.blue) return this
    return new Room(this.teamOf, { red, blue }, this.emojiOf)
  }

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

  private without(peerId: string): Seats {
    return {
      red: this.seatOf.red === peerId ? null : this.seatOf.red,
      blue: this.seatOf.blue === peerId ? null : this.seatOf.blue,
    }
  }
}

const emojiPalette = [
  '🦊',
  '🐸',
  '🦉',
  '🐼',
  '🐧',
  '🦁',
  '🐙',
  '🦄',
  '🐷',
  '🐵',
  '🦥',
  '🦩',
  '🐢',
  '🦎',
  '🐝',
  '🦖',
  '🐳',
  '🦔',
  '🐰',
  '🦇',
  '🐨',
  '🐮',
  '🐔',
  '🦆',
  '🐍',
  '🐺',
  '🦂',
  '🦀',
  '🐡',
  '🦑',
  '🐈',
  '🐕',
  '🦓',
  '🦍',
  '🦌',
  '🐘',
  '🦏',
  '🦛',
  '🐎',
  '🐐',
  '🦃',
  '🦚',
  '🦜',
  '🐦',
  '🦅',
  '🦢',
  '🐣',
  '🦡',
  '🦨',
  '🦫',
]
