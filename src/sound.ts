// Tiny synth for game cues: no audio files, just Web Audio oscillator blips.
// Each client plays these off the broadcast state, so everyone hears them.
let ctx: AudioContext | null = null

function blip(freq: number, at: number, duration: number): void {
  if (!ctx) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, ctx.currentTime + at)
  gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + at + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + duration)
  osc.connect(gain).connect(ctx.destination)
  osc.start(ctx.currentTime + at)
  osc.stop(ctx.currentTime + at + duration)
}

export type Sound = 'clue' | 'endTurn' | 'gameOver'

export function playSound(sound: Sound): void {
  ctx ??= new (window.AudioContext ?? (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  void ctx.resume()
  if (sound === 'clue') blip(660, 0, 0.18)
  else if (sound === 'endTurn') blip(330, 0, 0.22)
  else [523, 659, 784].forEach((freq, i) => blip(freq, i * 0.16, i === 2 ? 0.3 : 0.16))
}
