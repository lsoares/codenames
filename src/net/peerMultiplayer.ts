import Peer, { type DataConnection, type PeerOptions } from 'peerjs'
import { createGame, type BoardMode, type GameState, type Team } from '../game/createGame'
import { applyAction, type Action } from '../game/applyAction'

// What every peer renders, plus presence used for FIFO host takeover.
export interface RoomView {
  state: GameState
  seats: { red: string | null; blue: string | null } // one spymaster seat per team, by holder id
  teams: Record<string, Team> // auto-assigned team per peer, balanced on arrival
  peers: string[] // arrival order, host first
}

export interface Session {
  roomCode: string
  selfId: string
  dispatch: (action: Action) => void
  setSpymaster: (team: Team | null) => void
  subscribe: (listener: (view: RoomView) => void) => void
  onDisconnect: (listener: () => void) => void
}

type Presence = { __presence: true; spymasterTeam: Team | null }
type Ping = { __ping: true }

function randomCode(): string {
  return Math.random().toString(36).slice(2, 8)
}

// STUN + free TURN so peers behind restrictive NATs still connect. Defaults to
// Metered's OpenRelay static credentials; override with VITE_TURN_* for your own.
const iceServers: RTCIceServer[] = [
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

// Our own PeerServer when VITE_PEER_HOST is set (dev and prod point at it), else
// the public PeerJS broker. Either way peers get the TURN config above.
function newPeer(id?: string): Peer {
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

export function host(faces: string[], startingTeam: Team, mode: BoardMode): Promise<Session> {
  return startHost(randomCode(), createGame(faces, startingTeam, mode), 'new', 4)
}

// Re-host an existing game under the same room code (host reload or FIFO takeover).
// Generous retries: after a reload the broker holds the old id for a few seconds.
export function resumeHost(roomCode: string, state: GameState): Promise<Session> {
  return startHost(roomCode, state, 'resume', 15)
}

function startHost(
  code: string,
  initialState: GameState,
  mode: 'new' | 'resume',
  retries: number,
): Promise<Session> {
  return new Promise((resolve, reject) => {
    const peer = newPeer(code)
    const connections: DataConnection[] = []
    const seats: { red: string | null; blue: string | null } = { red: null, blue: null }
    const teams: Record<string, Team> = {}
    const listeners: Array<(view: RoomView) => void> = []
    let state = initialState

    // One holder per team, one seat per peer. A free seat can always be taken;
    // a held one can be stolen only while the game is fresh (before the first
    // clue), so the spymaster role can still rotate at the start.
    const claimSeat = (peerId: string, team: Team | null) => {
      if (seats.red === peerId) seats.red = null
      if (seats.blue === peerId) seats.blue = null
      const fresh = state.log.length === 0
      if (team && (!seats[team] || fresh)) seats[team] = peerId
    }
    // Auto-assign each peer to the smaller team on arrival, then leave it fixed.
    const assignTeam = (peerId: string) => {
      if (teams[peerId]) return
      const red = Object.values(teams).filter((t) => t === 'red').length
      const blue = Object.values(teams).filter((t) => t === 'blue').length
      teams[peerId] = red <= blue ? 'red' : 'blue'
    }
    // A joiner takes their team's spymaster seat if it's still open, so nobody has
    // to claim it by hand; a seat that's already held is left untouched.
    const autoSeat = (peerId: string) => {
      const team = teams[peerId]
      if (team && !seats[team]) seats[team] = peerId
    }
    const view = (): RoomView => ({
      state,
      seats: { red: seats.red, blue: seats.blue },
      teams: { ...teams },
      peers: [peer.id, ...connections.map((connection) => connection.peer)],
    })
    const broadcast = () => {
      const current = view()
      listeners.forEach((listener) => listener(current))
      connections.forEach((connection) => connection.open && connection.send(current))
    }

    const lastSeen = new Map<DataConnection, number>()
    const dropConnection = (connection: DataConnection) => {
      const index = connections.indexOf(connection)
      if (index < 0) return
      connections.splice(index, 1)
      claimSeat(connection.peer, null)
      delete teams[connection.peer]
      lastSeen.delete(connection)
      broadcast()
    }

    // Heartbeat both ways: guests detect host loss from these pings, and the host
    // prunes guests it hasn't heard from (an abrupt tab close never fires 'close').
    // Iterate a snapshot because dropConnection() splices `connections` — mutating
    // it mid-forEach would skip the neighbour of each pruned ghost, so a burst of
    // stale peers would clear only a few per pass and linger in the count.
    setInterval(() => {
      const now = Date.now()
      for (const connection of [...connections]) {
        if (!connection.open) {
          dropConnection(connection) // transport already gone
        } else {
          connection.send({ __ping: true } satisfies Ping)
          if (now - (lastSeen.get(connection) ?? now) > 6000) dropConnection(connection)
        }
      }
    }, 2000)

    peer.on('open', (id) => {
      assignTeam(id)
      resolve({
        roomCode: id,
        selfId: id,
        dispatch: (action) => {
          state = applyAction(state, action)
          broadcast()
        },
        setSpymaster: (team) => {
          claimSeat(peer.id, team)
          broadcast()
        },
        subscribe: (listener) => {
          listeners.push(listener)
          listener(view())
        },
        onDisconnect: () => {},
      })
    })

    peer.on('connection', (connection) => {
      connection.on('open', () => {
        connections.push(connection)
        lastSeen.set(connection, Date.now())
        assignTeam(connection.peer)
        autoSeat(connection.peer)
        broadcast()
      })
      connection.on('data', (data) => {
        lastSeen.set(connection, Date.now())
        if ((data as Ping).__ping) return // guest keepalive
        if ((data as Presence).__presence) {
          claimSeat(connection.peer, (data as Presence).spymasterTeam)
        } else {
          state = applyAction(state, data as Action)
        }
        broadcast()
      })
      connection.on('close', () => dropConnection(connection))
    })

    peer.on('error', (error: { type?: string }) => {
      if (error.type === 'unavailable-id' && retries > 0) {
        peer.destroy()
        const nextCode = mode === 'new' ? randomCode() : code
        setTimeout(
          () => startHost(nextCode, initialState, mode, retries - 1).then(resolve, reject),
          mode === 'resume' ? 800 : 0,
        )
      } else {
        reject(error)
      }
    })
  })
}

// Guest connects to the host by room code; detects host loss via heartbeat.
export function join(roomCode: string): Promise<Session> {
  return new Promise((resolve, reject) => {
    const peer = newPeer()

    peer.on('open', (selfId) => {
      const connection = peer.connect(roomCode, { reliable: true })
      const listeners: Array<(view: RoomView) => void> = []
      let latest: RoomView | null = null
      let disconnectHandler: () => void = () => {}
      let lastSeen = Date.now()
      let watchdog: ReturnType<typeof setInterval> | undefined
      let lost = false

      const markLost = () => {
        if (lost) return
        lost = true
        if (watchdog) clearInterval(watchdog)
        disconnectHandler()
      }

      connection.on('open', () => {
        lastSeen = Date.now()
        watchdog = setInterval(() => {
          // Keepalive so the host knows we're still here, and detect host loss.
          if (connection.open) connection.send({ __ping: true } satisfies Ping)
          if (Date.now() - lastSeen > 6000) markLost()
        }, 2000)
        resolve({
          roomCode,
          selfId,
          dispatch: (action) => connection.send(action),
          setSpymaster: (team) =>
            connection.send({ __presence: true, spymasterTeam: team } satisfies Presence),
          subscribe: (listener) => {
            listeners.push(listener)
            if (latest) listener(latest)
          },
          onDisconnect: (listener) => {
            disconnectHandler = listener
          },
        })
      })
      connection.on('data', (data) => {
        lastSeen = Date.now()
        if ((data as Ping).__ping) return
        latest = data as RoomView
        listeners.forEach((listener) => listener(latest as RoomView))
      })
      connection.on('close', markLost)
      connection.on('error', markLost)
    })

    peer.on('error', reject)
  })
}
