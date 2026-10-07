import type * as ToneLib from 'tone'

export type Tone = typeof ToneLib

let tone: Promise<Tone> | undefined

/**
 * Loads Tone.js on first use (it is most of the app's JavaScript) and unlocks
 * audio. Browsers only allow audio after a user gesture, so call this from a click.
 */
export async function loadTone(): Promise<Tone> {
  tone ??= import('tone')
  const Tone = await tone
  await Tone.start()
  return Tone
}

export type BassSynth = ToneLib.PolySynth<ToneLib.MonoSynth>

/** A plucky, synthesized electric-bass tone shared by every section. */
export function createBassSynth(Tone: Tone): BassSynth {
  return new Tone.PolySynth(Tone.MonoSynth, {
    oscillator: { type: 'fatsawtooth', count: 2, spread: 8 },
    filter: { type: 'lowpass', Q: 1.5, rolloff: -24 },
    envelope: { attack: 0.004, decay: 0.35, sustain: 0.35, release: 0.5 },
    filterEnvelope: {
      attack: 0.002,
      decay: 0.25,
      sustain: 0.25,
      release: 0.4,
      baseFrequency: 120,
      octaves: 3.2,
    },
    volume: -8,
  })
}
