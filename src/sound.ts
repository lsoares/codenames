// Game cues, played off the broadcast state so every client hears the same
// thing. The samples are CC0 from Kenney (kenney.nl) — see sounds/CREDITS.md.
// Each is fetched and decoded once, then replayed from the cached buffer.
import assassin from './sounds/assassin.ogg'
import clue from './sounds/clue.wav'
import endTurn from './sounds/endTurn.ogg'
import gameOver from './sounds/gameOver.ogg'
import guessRight from './sounds/guessRight.ogg'
import guessWrong from './sounds/guessWrong.ogg'
import newGame from './sounds/newGame.ogg'
import spymaster from './sounds/spymaster.ogg'
import takeover from './sounds/takeover.ogg'
import teamSwitch from './sounds/teamSwitch.ogg'
import victory from './sounds/victory.wav'
import minute from './sounds/minute.wav'
import tictac from './sounds/tictac.mp3'

export type Sound =
  | 'clue'
  | 'endTurn'
  | 'gameOver'
  | 'takeover'
  | 'spymaster'
  | 'newGame'
  | 'guessRight'
  | 'guessWrong'
  | 'teamSwitch'
  | 'assassin'
  | 'victory'
  | 'minute'
  | 'tictac'

const urls: Record<Sound, string> = {
  assassin,
  clue,
  endTurn,
  gameOver,
  takeover,
  spymaster,
  newGame,
  guessRight,
  guessWrong,
  teamSwitch,
  victory,
  minute,
  tictac,
}

let ctx: AudioContext | null = null
const buffers = new Map<Sound, AudioBuffer>()

async function load(sound: Sound): Promise<AudioBuffer | null> {
  if (!ctx) return null
  const cached = buffers.get(sound)
  if (cached) return cached
  const data = await (await fetch(urls[sound])).arrayBuffer()
  const buffer = await ctx.decodeAudioData(data)
  buffers.set(sound, buffer)
  return buffer
}

// `volume` scales this cue relative to the others (1 = the standard level). `slice`
// plays only part of the sample — { duration } from the start — so a longer clip
// (e.g. the tic-tac) can double as a shorter cue (a lone tic).
export function playSound(sound: Sound, volume = 1, slice: { duration?: number } = {}): void {
  const ac = resumeCtx()
  void load(sound).then((buffer) => {
    if (!buffer) return
    const source = ac.createBufferSource()
    const gain = ac.createGain()
    gain.gain.value = 0.5 * volume // the samples are normalised loud; keep cues in the background
    source.buffer = buffer
    source.connect(gain).connect(ac.destination)
    source.start(ac.currentTime, 0, slice.duration)
  })
}

function resumeCtx(): AudioContext {
  ctx ??= new (window.AudioContext ?? (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  void ctx.resume()
  return ctx
}

