export type Team = 'red' | 'blue'

export const spymasterEmoji: Record<Team, string> = { red: '🕵️‍♀️', blue: '🕵️‍♂️' }

export const teamName = (team: Team): string => (team === 'red' ? 'Red' : 'Blue')
