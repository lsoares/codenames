import Peer, { type DataConnection, type PeerOptions } from 'peerjs'

export function randomCode(): string {
  return Math.random().toString(36).slice(2, 8)
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
