import type * as ToneLib from 'tone'
import { BASS_SAMPLES } from './samples'

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

/** What every section plays bass notes through: the recorded bass, or the synth as a fallback. */
export type BassVoice = BassSynth | ToneLib.Sampler

let samples: Promise<Record<number, ToneLib.ToneAudioBuffer>> | undefined

/** Fetches and decodes the recorded bass once, however many voices use it. */
function loadSamples(Tone: Tone): Promise<Record<number, ToneLib.ToneAudioBuffer>> {
  samples ??= Promise.all(
    Object.entries(BASS_SAMPLES).map(async ([midi, url]) => [midi, await Tone.ToneAudioBuffer.fromUrl(url)]),
  ).then(Object.fromEntries)
  // Let a later play retry after a network hiccup.
  samples.catch(() => (samples = undefined))
  return samples
}

/**
 * The shared bass voice: a sampler playing the recordings in src/assets/samples/bass
 * (each note pitch-shifted from the nearest sample), or the synth if they fail to load.
 */
export async function loadBassVoice(Tone: Tone): Promise<BassVoice> {
  try {
    const urls = await loadSamples(Tone)
    if (!Object.keys(urls).length) throw new Error('No bass samples')
    return new Tone.Sampler({ urls, release: 0.3 })
  } catch (error) {
    console.warn('Bass samples unavailable, using the synth', error)
    return createBassSynth(Tone)
  }
}
