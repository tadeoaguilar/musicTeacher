import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, settingsFromParams, settingsToParams } from './scaleState'

describe('URL settings', () => {
  it('round-trips settings through search params', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      key: 'F#' as const,
      scale: 'dorian' as const,
      tuning: '5-standard',
      frets: 21 as const,
      labels: 'interval' as const,
      leftHanded: true,
      bpm: 120,
      direction: 'upDown' as const,
      loop: true,
    }
    expect(settingsFromParams(settingsToParams(settings))).toEqual(settings)
  })

  it('falls back to defaults for invalid values', () => {
    const params = new URLSearchParams('key=H&scale=bebop&tuning=7-string&frets=30&bpm=999&dir=sideways')
    expect(settingsFromParams(params)).toEqual(DEFAULT_SETTINGS)
  })
})
