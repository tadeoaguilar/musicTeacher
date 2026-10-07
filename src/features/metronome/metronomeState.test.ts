import { describe, expect, it } from 'vitest'
import {
  DEFAULT_METRONOME,
  metronomeFromParams,
  metronomeToParams,
  withMeter,
  type MetronomeSettings,
} from './metronomeState'

describe('metronome URL settings', () => {
  it('round-trips every setting', () => {
    const settings: MetronomeSettings = {
      ...DEFAULT_METRONOME,
      meter: '3/4',
      bpm: 132,
      sub: 4,
      swing: 60,
      accents: ['A', 'S', 'N'],
      pattern: 'waltz',
      root: 'A',
      click: 50,
      bass: 90,
      countIn: true,
      speedOn: true,
      speed: { target: 160, step: 4, every: 2 },
      gapOn: true,
      gap: { play: 3, mute: 1 },
    }
    expect(metronomeFromParams(metronomeToParams(settings))).toEqual(settings)
  })

  it('keeps short URLs for defaults', () => {
    expect(metronomeToParams(DEFAULT_METRONOME).toString()).toBe('ts=4%2F4&bpm=80')
  })

  it('ignores invalid or mismatched values', () => {
    const p = new URLSearchParams('ts=6/8&bpm=999&sub=4&acc=ANNN&pat=motown&root=H&sp=abc&gap=0-2')
    expect(metronomeFromParams(p)).toEqual(withMeter(DEFAULT_METRONOME, '6/8'))
  })
})

describe('withMeter', () => {
  it('resets accents and drops settings the new meter cannot use', () => {
    const s = withMeter({ ...DEFAULT_METRONOME, sub: 4, pattern: 'motown' }, '6/8')
    expect(s).toMatchObject({ accents: ['A', 'N'], sub: 1, pattern: 'none' })
    expect(withMeter({ ...DEFAULT_METRONOME, sub: 3 }, '12/8').sub).toBe(3)
  })
})
