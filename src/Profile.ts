export class Profile {
  static readonly maxNameLength = 14

  private constructor(
    readonly name: string,
    readonly emoji: string,
  ) {}

  static of(name: string, emoji: string): Profile | null {
    const trimmed = name.trim().slice(0, Profile.maxNameLength)
    if (!trimmed || !profileEmojis.includes(emoji)) return null
    return new Profile(trimmed, emoji)
  }

  static from(raw: unknown): Profile {
    const { name, emoji } = (raw ?? {}) as { name?: unknown; emoji?: unknown }
    const cleanName = typeof name === 'string' ? name.trim().slice(0, Profile.maxNameLength) : ''
    const cleanEmoji = typeof emoji === 'string' && profileEmojis.includes(emoji) ? emoji : '👤'
    return new Profile(cleanName || 'Agent', cleanEmoji)
  }
}

export const profileEmojis = [
  ...'🦊🐸🦉🐼🐧🦁🐙🦄🐷🐵🦥🦩🐢🦎🐝🦖🐳🦔🐰🦇🐨🐮🐔🦆🐍🐺🦂🦀🐡🦑🐈🐕🦓🦍🦌🐘🦏🦛🐎🐐🦃🦚🦜🐦🦅🦢🐣🦡🦨🦫',
]
