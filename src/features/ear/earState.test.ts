import { describe, expect, it } from 'vitest'
import { DEFAULT_EAR, earFromParams, earToParams } from './earState'

describe('URL settings', () => {
  it('round-trips settings through search params', () => {
    const settings = {
      level: 3 as const,
      tuning: '5-standard',
      frets: 21 as const,
      leftHanded: true,
      showName: false,
    }
    expect(earToParams(settings).toString()).toBe('level=3&name=0&tuning=5-standard&frets=21&lefty=1')
    expect(earFromParams(earToParams(settings))).toEqual(settings)
  })

  it('leaves defaults out of the URL', () => {
    expect(earToParams(DEFAULT_EAR).toString()).toBe('')
  })

  it('falls back to defaults for invalid values', () => {
    expect(earFromParams(new URLSearchParams('level=9&tuning=7-string&frets=30'))).toEqual(DEFAULT_EAR)
  })
})
