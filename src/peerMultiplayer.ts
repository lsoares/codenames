import { newPeer } from './peer'
import type { Ping, Presence, RoomView, Session, TeamClaim } from './Session'

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
