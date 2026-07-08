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

// `volume` scales this cue relative to the others (1 = the standard level), for a
// cue that should sit quieter than the rest — e.g. the recurring minute tick.
export function playSound(sound: Sound, volume = 1): void {
  ctx ??= new (window.AudioContext ?? (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  void ctx.resume()
  void load(sound).then((buffer) => {
    if (!buffer || !ctx) return
    const source = ctx.createBufferSource()
    const gain = ctx.createGain()
    gain.gain.value = 0.5 * volume // the samples are normalised loud; keep cues in the background
    source.buffer = buffer
    source.connect(gain).connect(ctx.destination)
    source.start()
  })
}
