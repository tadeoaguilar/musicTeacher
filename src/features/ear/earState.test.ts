import { describe, expect, it } from 'vitest'
import { DEFAULT_EAR, earFromParams, earToParams } from './earState'

describe('URL settings', () => {
  it('round-trips settings through search params', () => {
    const settings = {
      exercise: 'interval' as const,
      level: 3 as const,
      tuning: '5-standard',
      frets: 21 as const,
      leftHanded: true,
      showName: false,
      play: 'mixed' as const,
    }
    expect(earToParams(settings).toString()).toBe(
      'ex=interval&level=3&name=0&play=mixed&tuning=5-standard&frets=21&lefty=1',
    )
    expect(earFromParams(earToParams(settings))).toEqual(settings)
  })

  it('leaves defaults out of the URL', () => {
    expect(earToParams(DEFAULT_EAR).toString()).toBe('')
  })

  it('keeps old Find the note links working', () => {
    expect(earFromParams(new URLSearchParams('level=2'))).toMatchObject({ exercise: 'note', level: 2 })
  })

  it('falls back to defaults for invalid values', () => {
    expect(
      earFromParams(new URLSearchParams('ex=chords&level=9&play=sideways&tuning=7-string&frets=30')),
    ).toEqual(DEFAULT_EAR)
  })
})
