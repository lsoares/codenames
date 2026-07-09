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
  | 'tictac'

export function playSound(sound: Sound, volume = 1, slice: { duration?: number } = {}): void {
  const ac = resumeCtx()
  void load(sound).then((buffer) => {
    if (!buffer) return
    const source = ac.createBufferSource()
    const gain = ac.createGain()
    gain.gain.value = 0.5 * volume
    source.buffer = buffer
    source.connect(gain).connect(ac.destination)
    source.start(ac.currentTime, 0, slice.duration)
  })
}

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

function resumeCtx(): AudioContext {
  ctx ??= new (window.AudioContext ?? (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  void ctx.resume()
  return ctx
}

