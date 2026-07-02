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

// Host owns the authoritative game state: it applies every action (its own and
// guests') and broadcasts the new state to all connected peers.
export function host(images: string[], startingTeam: Team): Promise<Session> {
  return attemptHost(images, startingTeam, 3)
}

function attemptHost(images: string[], startingTeam: Team, retries: number): Promise<Session> {
  return new Promise((resolve, reject) => {
    const peer = new Peer(randomCode())
    const connections: DataConnection[] = []
    const listeners: Array<(state: GameState) => void> = []
    let state: GameState

    const broadcast = () => {
      listeners.forEach((listener) => listener(state))
      connections.forEach((connection) => connection.open && connection.send(state))
    }

    peer.on('open', (id) => {
      state = createGame(images, startingTeam)
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
        attemptHost(images, startingTeam, retries - 1).then(resolve, reject)
      } else {
        reject(error)
      }
    })
  })
}

// Guest connects to the host by room code, sends actions, and receives state.
export function join(roomCode: string): Promise<Session> {
  return new Promise((resolve, reject) => {
    const peer = new Peer()

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
