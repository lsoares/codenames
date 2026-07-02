import Peer, { type DataConnection } from 'peerjs'
import { createGame, type GameState, type Team } from '../game/createGame'
import { applyAction, type Action } from '../game/applyAction'

export interface Session {
  roomCode: string
  dispatch: (action: Action) => void
  subscribe: (listener: (state: GameState) => void) => void
}

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

// Host owns the authoritative game state: it applies every action (its own and
// guests') and broadcasts the new state to all connected peers.
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
    const listeners: Array<(state: GameState) => void> = []
    let state = initialState

    const broadcast = () => {
      listeners.forEach((listener) => listener(state))
      connections.forEach((connection) => connection.open && connection.send(state))
    }

    peer.on('open', (id) => {
      resolve({
        roomCode: id,
        dispatch: (action) => {
          state = applyAction(state, action)
          broadcast()
        },
        subscribe: (listener) => {
          listeners.push(listener)
          listener(state)
        },
      })
    })

    peer.on('connection', (connection) => {
      connection.on('open', () => {
        connections.push(connection)
        connection.send(state)
      })
      connection.on('data', (data) => {
        state = applyAction(state, data as Action)
        broadcast()
      })
      connection.on('close', () => {
        const index = connections.indexOf(connection)
        if (index >= 0) connections.splice(index, 1)
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

// Guest connects to the host by room code, sends actions, and receives state.
export function join(roomCode: string): Promise<Session> {
  return new Promise((resolve, reject) => {
    const peer = newPeer()

    peer.on('open', () => {
      const connection = peer.connect(roomCode, { reliable: true })
      const listeners: Array<(state: GameState) => void> = []
      let latest: GameState | null = null

      connection.on('open', () => {
        resolve({
          roomCode,
          dispatch: (action) => connection.send(action),
          subscribe: (listener) => {
            listeners.push(listener)
            if (latest) listener(latest)
          },
        })
      })
      connection.on('data', (data) => {
        latest = data as GameState
        listeners.forEach((listener) => listener(latest as GameState))
      })
    })

    peer.on('error', reject)
  })
}
