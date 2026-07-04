import { type DataConnection } from 'peerjs'
import { Game, createGame, type BoardMode, type GameState, type Team } from './Game'
import { Room } from './Room'
import { newPeer, randomCode } from './peer'
import type { Action, RoomView, Session } from './Session'

const apply = (game: Game, action: Action): Game => {
  switch (action.type) {
    case 'clue':
      return game.giveClue(action.word, action.count)
    case 'guess':
      return game.guess(action.cardIndex)
    case 'toggleMark':
      return game.mark(action.cardIndex, action.team)
    case 'endTurn':
      return game.endTurn()
    case 'newGame':
      return game.newGame(action.faces, action.mode)
  }
}

type Presence = { __presence: true; spymasterTeam: Team | null }
type TeamClaim = { __team: true; team: Team }
type Ping = { __ping: true }

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
    const listeners: Array<(view: RoomView) => void> = []
    let game = new Game(initialState)
    let room = new Room()

    const view = (): RoomView => ({
      state: game.state,
      seats: room.seats,
      teams: room.teams,
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
      room = room.drop(connection.peer)
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
      const present = new Set([peer.id, ...connections.map((connection) => connection.peer)])
      const pruned = room.freeAbsentSeats(present)
      if (pruned !== room) {
        room = pruned
        broadcast()
      }
    }, 2000)

    peer.on('open', (id) => {
      room = room.assignTeam(id)
      // Seat the host as their team's spymaster too, just like a joiner — but only
      // for a brand-new room, so a reload or FIFO takeover doesn't hand the seat
      // (and the colour key) to whoever happens to re-host mid-game.
      if (mode === 'new') room = room.autoSeat(id)
      resolve({
        roomCode: id,
        selfId: id,
        dispatch: (action) => {
          game = apply(game, action)
          broadcast()
        },
        setSpymaster: (team) => {
          room = room.claimSeat(peer.id, team)
          broadcast()
        },
        setTeam: (team) => {
          room = room.setTeam(peer.id, team)
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
        room = room.assignTeam(connection.peer).autoSeat(connection.peer)
        broadcast()
      })
      connection.on('data', (data) => {
        lastSeen.set(connection, Date.now())
        if ((data as Ping).__ping) return // guest keepalive
        if ((data as Presence).__presence) {
          room = room.claimSeat(connection.peer, (data as Presence).spymasterTeam)
        } else if ((data as TeamClaim).__team) {
          room = room.setTeam(connection.peer, (data as TeamClaim).team)
        } else {
          game = apply(game, data as Action)
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
          setTeam: (team) =>
            connection.send({ __team: true, team } satisfies TeamClaim),
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
