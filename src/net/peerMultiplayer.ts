import Peer, { type DataConnection } from 'peerjs'
import { createGame, type GameState, type Team } from '../game/createGame'
import { applyAction, type Action } from '../game/applyAction'

// What every peer renders, plus presence used for FIFO host takeover.
export interface RoomView {
  state: GameState
  spymasters: number
  peers: string[] // arrival order, host first
}

export interface Session {
  roomCode: string
  selfId: string
  dispatch: (action: Action) => void
  setSpymaster: (value: boolean) => void
  subscribe: (listener: (view: RoomView) => void) => void
  onDisconnect: (listener: () => void) => void
}

type Presence = { __presence: true; spymaster: boolean }
type Ping = { __ping: true }

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
    const spymasterByConn = new Map<DataConnection, boolean>()
    const listeners: Array<(view: RoomView) => void> = []
    let state = initialState
    let hostSpymaster = false

    const spymasterCount = () => {
      let count = hostSpymaster ? 1 : 0
      for (const flag of spymasterByConn.values()) if (flag) count++
      return count
    }
    const view = (): RoomView => ({
      state,
      spymasters: spymasterCount(),
      peers: [peer.id, ...connections.map((connection) => connection.peer)],
    })
    const broadcast = () => {
      const current = view()
      listeners.forEach((listener) => listener(current))
      connections.forEach((connection) => connection.open && connection.send(current))
    }

    // Heartbeat so guests can detect an abrupt host disappearance.
    setInterval(() => {
      connections.forEach((connection) => connection.open && connection.send({ __ping: true } satisfies Ping))
    }, 2000)

    peer.on('open', (id) => {
      resolve({
        roomCode: id,
        selfId: id,
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
        broadcast()
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
          if (Date.now() - lastSeen > 6000) markLost()
        }, 2000)
        resolve({
          roomCode,
          selfId,
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
