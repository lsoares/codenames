import Peer, { type DataConnection, type PeerOptions } from 'peerjs'

export function randomCode(): string {
  return Math.random().toString(36).slice(2, 8)
}

// Friendly, shareable room codes: an adjective and a noun, lowercased and
// hyphen-joined (e.g. "mighty-dragon"), so a host can read one aloud to whoever
// is next to them. The two pools were harvested once from Datamuse — adjectives
// describing evocative seeds (rel_jjb) and nouns triggered by concrete,
// picturable seeds (rel_trg), frequency-banded to drop function words — then
// kept here beside the id generator so a room is minted instantly and offline,
// never blocking on a live word source. ~60×120 pairs make a clash unlikely, and
// the host retries with a fresh pair on the rare collision.
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

// A stable id for this browser tab, kept in sessionStorage so a reload or a
// reconnect comes back as the *same* peer instead of a fresh one — otherwise the
// host keeps the old id's seat/team around as a ghost. Per-tab (sessionStorage,
// not localStorage) so two tabs of the same browser never collide on one id.
// Longer than a room code, so a guest id can never look like a host's.
export function tabPeerId(): string {
  const existing = sessionStorage.getItem('codenames:peer-id')
  if (existing) return existing
  const id = randomCode() + randomCode()
  sessionStorage.setItem('codenames:peer-id', id)
  return id
}

// Abandon this tab's stored id and mint a new one. Used when the broker reports
// the id is taken — by a ghost of a prior socket the server hasn't expired, or by
// a duplicated tab that copied our sessionStorage — so retrying the same id would
// loop forever on ID-TAKEN.
export function resetTabPeerId(): string {
  sessionStorage.removeItem('codenames:peer-id')
  return tabPeerId()
}

// STUN + free TURN so peers behind restrictive NATs still connect. Defaults to
// Metered's OpenRelay static credentials; override with VITE_TURN_* for your own.
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

// Our own PeerServer when VITE_PEER_HOST is set (dev and prod point at it), else
// the public PeerJS broker. Either way peers get the TURN config above.
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
