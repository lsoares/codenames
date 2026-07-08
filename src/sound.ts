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
  const ac = resumeCtx()
  void load(sound).then((buffer) => {
    if (!buffer) return
    const source = ac.createBufferSource()
    const gain = ac.createGain()
    gain.gain.value = 0.5 * volume // the samples are normalised loud; keep cues in the background
    source.buffer = buffer
    source.connect(gain).connect(ac.destination)
    source.start()
  })
}

function resumeCtx(): AudioContext {
  ctx ??= new (window.AudioContext ?? (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  void ctx.resume()
  return ctx
}

// A wall-clock tic-tac, synthesised on the fly rather than sampled: a short
// band-passed noise click whose pitch alternates by beat — a higher "tic" on even
// counts, a lower "tac" on odd — so a running timer sounds like a real clock.
// Client-local, like the rest of the timer; `volume` scales it as in playSound.
export function playTick(beat: number, volume = 1, delay = 0): void {
  const ac = resumeCtx()
  const tic = beat % 2 === 0
  // Both clicks are kept audibly long enough to register as a distinct tic and tac.
  const decay = tic ? 0.026 : 0.034
  const now = ac.currentTime + delay
  const length = Math.max(1, Math.floor(ac.sampleRate * decay))
  const noise = ac.createBuffer(1, length, ac.sampleRate)
  const data = noise.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  const source = ac.createBufferSource()
  source.buffer = noise
  const band = ac.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = tic ? 2600 : 1500
  band.Q.value = 12
  const gain = ac.createGain()
  gain.gain.setValueAtTime(0.5 * volume, now)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + decay)
  source.connect(band).connect(gain).connect(ac.destination)
  source.start(now)
  source.stop(now + decay + 0.02)
}
