import { describe, expect, it } from 'vitest'
import { DEFAULT_ARPEGGIO, arpeggioFromParams, arpeggioToParams } from './arpeggioState'

describe('URL settings', () => {
  it('round-trips settings through search params', () => {
    const settings = {
      ...DEFAULT_ARPEGGIO,
      key: 'Bb' as const,
      chord: 'm7b5' as const,
      octaves: 2 as const,
      tuning: '5-standard',
      frets: 21 as const,
      labels: 'interval' as const,
      leftHanded: true,
      bpm: 120,
      direction: 'upDown' as const,
      loop: true,
    }
    expect(arpeggioFromParams(arpeggioToParams(settings))).toEqual(settings)
  })

  it('keeps short URLs for defaults', () => {
    expect(arpeggioToParams(DEFAULT_ARPEGGIO).toString()).toBe('key=C&chord=maj')
  })

  it('falls back to defaults for invalid values', () => {
    const params = new URLSearchParams('key=H&chord=add9&oct=3&tuning=7-string&bpm=999')
    expect(arpeggioFromParams(params)).toEqual(DEFAULT_ARPEGGIO)
  })
})
