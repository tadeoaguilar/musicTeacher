import { describe, expect, it } from 'vitest'
import { DEFAULT_TUNER, tunerFromParams, tunerToParams } from './tunerState'

describe('URL settings', () => {
  it('round-trips settings through search params', () => {
    const settings = { tuning: '5-drop-a', a4: 432 }
    expect(tunerToParams(settings).toString()).toBe('tuning=5-drop-a&a4=432')
    expect(tunerFromParams(tunerToParams(settings))).toEqual(settings)
  })

  it('leaves defaults out of the URL', () => {
    expect(tunerToParams(DEFAULT_TUNER).toString()).toBe('')
  })

  it('falls back to defaults for invalid values', () => {
    expect(tunerFromParams(new URLSearchParams('tuning=7-string&a4=500'))).toEqual(DEFAULT_TUNER)
    expect(tunerFromParams(new URLSearchParams('a4=440.5'))).toEqual(DEFAULT_TUNER)
  })
})
