import Peer, { type DataConnection } from 'peerjs'
import { createGame, type GameState, type Team } from '../game/createGame'
import { applyAction, type Action } from '../game/applyAction'

// What every peer renders: the game plus live presence (how many spymasters
// are currently viewing the key — a tell for extra peekers).
export interface RoomView {
  state: GameState
  spymasters: number
}

export interface Session {
  roomCode: string
  dispatch: (action: Action) => void
  setSpymaster: (value: boolean) => void
  subscribe: (listener: (view: RoomView) => void) => void
  // Guests: fires when the connection to the host drops (host gone).
  onDisconnect: (listener: () => void) => void
}

type Presence = { __presence: true; spymaster: boolean }

// Short, URL-friendly room code used as the host's PeerJS id.
function randomCode(): string {
  return Math.random().toString(36).slice(2, 8)
}

// Public PeerJS broker by default; a local broker when VITE_PEER_HOST is set
// (used by the Playwright suite so signaling has no external dependency).
function newPeer(id?: string): Peer {
  const brokerHost = import.meta.env.VITE_PEER_HOST
  if (!brokerHost) return id ? new Peer(id) : new Peer()
  const options = {
    host: brokerHost,
    port: Number(import.meta.env.VITE_PEER_PORT),
    path: import.meta.env.VITE_PEER_PATH ?? '/',
    key: import.meta.env.VITE_PEER_KEY ?? 'peerjs',
  }
  return id ? new Peer(id, options) : new Peer(options)
}

export function host(images: string[], startingTeam: Team): Promise<Session> {
  return startHost(randomCode(), createGame(images, startingTeam), 'new', 4)
}

// Re-host an existing game under the same room code after the host tab reloads.
export function resumeHost(roomCode: string, state: GameState): Promise<Session> {
  return startHost(roomCode, state, 'resume', 8)
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
    const spymasterByConn = new Map<DataConnection, boolean>()
    const listeners: Array<(view: RoomView) => void> = []
    let state = initialState
    let hostSpymaster = false

    const spymasterCount = () => {
      let count = hostSpymaster ? 1 : 0
      for (const flag of spymasterByConn.values()) if (flag) count++
      return count
    }
    const view = (): RoomView => ({ state, spymasters: spymasterCount() })
    const broadcast = () => {
      const current = view()
      listeners.forEach((listener) => listener(current))
      connections.forEach((connection) => connection.open && connection.send(current))
    }

    peer.on('open', (id) => {
      resolve({
        roomCode: id,
        dispatch: (action) => {
          state = applyAction(state, action)
          broadcast()
        },
        setSpymaster: (value) => {
          hostSpymaster = value
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
        connection.send(view())
      })
      connection.on('data', (data) => {
        if ((data as Presence).__presence) {
          spymasterByConn.set(connection, (data as Presence).spymaster)
        } else {
          state = applyAction(state, data as Action)
        }
        broadcast()
      })
      connection.on('close', () => {
        const index = connections.indexOf(connection)
        if (index >= 0) connections.splice(index, 1)
        spymasterByConn.delete(connection)
        broadcast()
      })
    })

    peer.on('error', (error: { type?: string }) => {
      if (error.type === 'unavailable-id' && retries > 0) {
        peer.destroy()
        const nextCode = mode === 'new' ? randomCode() : code
        setTimeout(
          () => startHost(nextCode, initialState, mode, retries - 1).then(resolve, reject),
          mode === 'resume' ? 600 : 0,
        )
      } else {
        reject(error)
      }
    })
  })
}

// Guest connects to the host by room code, sends actions/presence, receives views.
export function join(roomCode: string): Promise<Session> {
  return new Promise((resolve, reject) => {
    const peer = newPeer()

    peer.on('open', () => {
      const connection = peer.connect(roomCode, { reliable: true })
      const listeners: Array<(view: RoomView) => void> = []
      let latest: RoomView | null = null
      let disconnectHandler: () => void = () => {}

      connection.on('open', () => {
        resolve({
          roomCode,
          dispatch: (action) => connection.send(action),
          setSpymaster: (value) =>
            connection.send({ __presence: true, spymaster: value } satisfies Presence),
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
        latest = data as RoomView
        listeners.forEach((listener) => listener(latest as RoomView))
      })
      connection.on('close', () => disconnectHandler())
    })

    peer.on('error', reject)
  })
}
