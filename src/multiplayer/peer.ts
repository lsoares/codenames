import Peer, { type DataConnection, type PeerOptions } from 'peerjs'

function randomCode(): string {
  return Math.random().toString(36).slice(2, 8)
}

const ROOM_ADJECTIVES = [
  'pure', 'ideal', 'evil', 'soft', 'strange', 'fresh', 'divine', 'wild',
  'famous', 'warm', 'rare', 'clean', 'bright', 'vast', 'alive', 'silent',
  'wise', 'hidden', 'sacred', 'cool', 'enormous', 'friendly', 'tiny', 'magic',
  'noble', 'proud', 'calm', 'curious', 'infinite', 'romantic', 'solar', 'mad',
  'giant', 'gentle', 'frozen', 'immense', 'bold', 'mighty', 'brave', 'purple',
  'heroic', 'clever', 'splendid', 'fierce', 'potent', 'wicked', 'epic', 'cosmic',
  'vivid', 'deadly', 'furious', 'scarlet', 'gigantic', 'fiery', 'mythical', 'sinister',
  'luminous', 'crimson', 'gallant', 'fabulous', 'winged', 'stormy', 'mythic', 'fearless',
  'valiant',
]

const ROOM_NOUNS = [
  'dragon', 'wolf', 'tiger', 'lion', 'eagle', 'snake', 'owl', 'shark',
  'monkey', 'elephant', 'deer', 'salmon', 'trout', 'raven', 'serpent', 'spider',
  'dove', 'lizard', 'parrot', 'tuna', 'beetle', 'moth', 'bee', 'duck',
  'bat', 'sheep', 'chicken', 'pigeon', 'ant', 'perch', 'cattle', 'fowl',
  'dog', 'cat', 'bird', 'fish', 'knight', 'magician', 'captain', 'merchant',
  'baron', 'earl', 'duke', 'princess', 'angel', 'devil', 'demon', 'fairy',
  'witch', 'ghost', 'alien', 'robot', 'monster', 'beast', 'creature', 'dwarf',
  'hero', 'villain', 'mutant', 'skeleton', 'hunter', 'warrior', 'clown', 'forest',
  'ocean', 'mountain', 'valley', 'lake', 'coast', 'beach', 'desert', 'canyon',
  'glacier', 'plateau', 'grove', 'pond', 'brook', 'creek', 'reef', 'coral',
  'peak', 'palace', 'fortress', 'mansion', 'tower', 'abbey', 'chapel', 'manor',
  'monument', 'ruin', 'garden', 'empire', 'planet', 'moon', 'star', 'galaxy',
  'universe', 'orbit', 'rainbow', 'shadow', 'sword', 'blade', 'armor', 'weapon',
  'spell', 'quest', 'voyage', 'legend', 'fantasy', 'treasure', 'oak', 'pine',
  'palm', 'lotus', 'lily', 'blossom', 'berry', 'cherry', 'lemon', 'peach',
  'plum', 'apple', 'olive', 'grape', 'coconut', 'honey',
]

export function randomRoomCode(): string {
  const pick = (pool: string[]) => pool[Math.floor(Math.random() * pool.length)]
  return `${pick(ROOM_ADJECTIVES)}-${pick(ROOM_NOUNS)}`
}

export function tabPeerId(): string {
  const existing = sessionStorage.getItem('codenames:peer-id')
  if (existing) return existing
  const id = randomCode() + randomCode()
  sessionStorage.setItem('codenames:peer-id', id)
  return id
}

export function resetTabPeerId(): string {
  sessionStorage.removeItem('codenames:peer-id')
  return tabPeerId()
}

const fallbackIceServers: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  import.meta.env.VITE_TURN_URL
    ? {
        urls: import.meta.env.VITE_TURN_URL,
        username: import.meta.env.VITE_TURN_USERNAME,
        credential: import.meta.env.VITE_TURN_CREDENTIAL,
      }
    : {
        urls: [
          'turn:openrelay.metered.ca:80',
          'turn:openrelay.metered.ca:443',
          'turn:openrelay.metered.ca:443?transport=tcp',
        ],
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
]

let iceServers = fallbackIceServers

export const iceServersReady: Promise<void> = import.meta.env.VITE_METERED_TURN_URL
  ? fetch(import.meta.env.VITE_METERED_TURN_URL)
      .then((response) => response.json())
      .then((servers: RTCIceServer[]) => {
        if (Array.isArray(servers) && servers.length) iceServers = servers
      })
      .catch(() => {})
  : Promise.resolve()

export function newPeer(id?: string): Peer {
  const brokerHost = import.meta.env.VITE_PEER_HOST
  const options: PeerOptions = { config: { iceServers } }
  if (brokerHost) {
    options.host = brokerHost
    options.port = Number(import.meta.env.VITE_PEER_PORT)
    options.path = import.meta.env.VITE_PEER_PATH ?? '/'
    options.key = import.meta.env.VITE_PEER_KEY ?? 'peerjs'
    options.secure = import.meta.env.VITE_PEER_SECURE === 'true' || undefined
  }
  return id ? new Peer(id, options) : new Peer(options)
}

export function logConnection(connection: DataConnection): void {
  const pc = connection.peerConnection
  const report = async () => {
    const stats = [...(await pc.getStats()).values()] as any[]
    const pair = stats.find((s) => s.type === 'candidate-pair' && s.state === 'succeeded')
    const local = stats.find((s) => s.id === pair?.localCandidateId)
    const remote = stats.find((s) => s.id === pair?.remoteCandidateId)
    const relayed = local?.candidateType === 'relay' || remote?.candidateType === 'relay'
    console.info(
      `[rtc] ${connection.peer}: ${local?.candidateType} ↔ ${remote?.candidateType} over ${local?.protocol} — ${relayed ? 'TURN relay' : 'direct'}`,
    )
  }
  pc.addEventListener('connectionstatechange', () => {
    console.info(`[rtc] ${connection.peer}: ${pc.connectionState}`)
    if (pc.connectionState === 'connected') void report()
  })
}
