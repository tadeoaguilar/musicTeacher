import { describe, expect, it } from 'vitest'
import { frequencyToMidi, midiToFrequency, noteMidi } from '../theory/notes'
import { getTuning } from '../theory/tunings'
import { detectPitch, downsample } from './detect'
import { MAX_HZ, MIN_HZ, createSmoother, matchString, readNote } from './tuner'

const RATE = 48000
const FACTOR = 4
/** The same window the mic reads: 8192 samples at 48 kHz (~170 ms). */
const WINDOW = 8192

/** A bass-like tone: weak fundamental, louder 2nd and 3rd harmonics. */
function bassTone(hz: number, harmonics = [0.3, 1, 0.6, 0.3, 0.15]) {
  const out = new Float32Array(WINDOW)
  for (let i = 0; i < WINDOW; i++) {
    let v = 0
    harmonics.forEach((amp, h) => (v += amp * Math.sin((2 * Math.PI * hz * (h + 1) * i) / RATE + h)))
    out[i] = 0.2 * v
  }
  return out
}

const detect = (samples: Float32Array) =>
  detectPitch(downsample(samples, FACTOR), RATE / FACTOR, { minHz: MIN_HZ, maxHz: MAX_HZ })

const centsOff = (hz: number, target: number) => 1200 * Math.log2(hz / target)

describe('detectPitch', () => {
  const notes = ['A0', 'B0', 'E1', 'A1', 'D2', 'G2', 'C3']

  it.each(notes)('finds %s from a pure sine', (note) => {
    const target = midiToFrequency(noteMidi(note))
    const pitch = detect(bassTone(target, [1]))!
    expect(Math.abs(centsOff(pitch.hz, target))).toBeLessThan(1)
  })

  it.each(notes)('finds %s in the right octave when the fundamental is weak', (note) => {
    const target = midiToFrequency(noteMidi(note))
    const pitch = detect(bassTone(target))!
    expect(Math.abs(centsOff(pitch.hz, target))).toBeLessThan(1)
    expect(pitch.clarity).toBeGreaterThan(0.85)
  })

  it('measures a slightly flat string', () => {
    const target = 55 * 2 ** (-12 / 1200)
    expect(centsOff(detect(bassTone(target))!.hz, 55)).toBeCloseTo(-12, 0)
  })

  it('ignores silence', () => {
    expect(detect(new Float32Array(WINDOW))).toBeNull()
  })

  it('ignores noise', () => {
    let seed = 1
    const noise = new Float32Array(WINDOW).map(() => {
      seed = (seed * 16807) % 2147483647
      return (seed / 2147483647 - 0.5) * 0.5
    })
    expect(detect(noise)).toBeNull()
  })
})

describe('readNote', () => {
  it('names the nearest note and how far off it is', () => {
    expect(readNote(55)).toEqual({ midi: 33, cents: 0, name: 'A1' })
    const sharp = readNote(midiToFrequency(noteMidi('E1')) * 2 ** (10 / 1200))
    expect(sharp.name).toBe('E1')
    expect(sharp.cents).toBeCloseTo(10, 5)
    expect(readNote(30.87).name).toBe('B0')
    expect(readNote(midiToFrequency(noteMidi('Bb0'))).name).toBe('Bb0')
  })

  it('reads flat notes as negative cents', () => {
    expect(readNote(54).cents).toBeLessThan(0)
  })

  it('respects the A4 reference', () => {
    expect(frequencyToMidi(432, 432)).toBe(69)
    // 54 Hz is a perfect A1 at A4 = 432, but flat at 440.
    expect(readNote(54, 432)).toMatchObject({ name: 'A1', cents: 0 })
    expect(readNote(54, 440).cents).toBeCloseTo(-31.8, 0)
  })
})

describe('matchString', () => {
  it('finds the string tuned to a note', () => {
    expect(matchString(noteMidi('A1'), getTuning('4-standard')!)).toBe(1)
    expect(matchString(noteMidi('B0'), getTuning('5-standard')!)).toBe(0)
    expect(matchString(noteMidi('D1'), getTuning('4-drop-d')!)).toBe(0)
  })

  it('returns undefined for notes that are no open string', () => {
    expect(matchString(noteMidi('E1'), getTuning('4-drop-d')!)).toBeUndefined()
    expect(matchString(noteMidi('E2'), getTuning('4-standard')!)).toBeUndefined()
  })
})

describe('createSmoother', () => {
  it('ignores a single wrong-octave reading', () => {
    const s = createSmoother()
    for (const hz of [55, 55.1, 54.9, 55]) s.push(hz)
    expect(s.push(110)).toBeCloseTo(55, 0)
  })

  it('holds the note through brief dropouts, then lets go', () => {
    const s = createSmoother()
    s.push(55)
    for (let i = 0; i < 6; i++) expect(s.push(null)).toBe(55)
    expect(s.push(null)).toBeNull()
  })

  it('follows a new note after a few readings', () => {
    const s = createSmoother()
    for (let i = 0; i < 5; i++) s.push(55)
    for (let i = 0; i < 2; i++) s.push(73.4)
    expect(s.push(73.4)).toBeCloseTo(73.4, 1)
  })
})
