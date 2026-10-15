import { describe, expect, it } from 'vitest'
import { noteMidi } from '../theory/notes'
import { BASS_SAMPLES, sampleMidi, sampleUrls } from './samples'

describe('sampleMidi', () => {
  it('reads note names with s for sharp', () => {
    expect(sampleMidi('../assets/samples/bass/E1.mp3')).toBe(28)
    expect(sampleMidi('As1.mp3')).toBe(34)
    expect(sampleMidi('/x/Cs3.mp3')).toBe(49)
    expect(sampleMidi('B0.mp3')).toBe(23)
  })

  it('ignores anything else', () => {
    expect(sampleMidi('E1.wav')).toBeUndefined()
    expect(sampleMidi('Bb1.mp3')).toBeUndefined()
    expect(sampleMidi('take.mp3')).toBeUndefined()
  })
})

describe('sampleUrls', () => {
  it('keys URLs by MIDI number and skips unknown files', () => {
    expect(sampleUrls({ 'a/E1.mp3': '/E1-abc.mp3', 'a/notes.mp3': '/x.mp3' })).toEqual({ 28: '/E1-abc.mp3' })
  })
})

describe('BASS_SAMPLES', () => {
  const midis = Object.keys(BASS_SAMPLES)
    .map(Number)
    .sort((a, b) => a - b)

  it('covers E1–G3, the whole 4-string range', () => {
    expect(midis[0]).toBeLessThanOrEqual(noteMidi('E1'))
    expect(midis.at(-1)).toBeGreaterThanOrEqual(noteMidi('G3'))
  })

  it('leaves no gap over 3 semitones, so no note is shifted more than 1.5', () => {
    for (let i = 1; i < midis.length; i++) expect(midis[i] - midis[i - 1]).toBeLessThanOrEqual(3)
  })
})
