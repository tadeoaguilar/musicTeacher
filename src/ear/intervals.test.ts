import { describe, expect, it } from 'vitest'
import { openStringMidi } from '../theory/fretboard'
import { noteMidi } from '../theory/notes'
import { getTuning } from '../theory/tunings'
import {
  INTERVAL_IDS,
  INTERVAL_MAX_FRET,
  firstOf,
  highOf,
  intervalsFor,
  lowNotesFor,
  nextIntervalQuestion,
  positionNear,
  semitonesOf,
  shapeOf,
  type IntervalOptions,
} from './intervals'
import { createRandom } from './random'

const fourString = getTuning('4-standard')!
const options = (overrides: Partial<IntervalOptions> = {}): IntervalOptions => ({
  tuning: fourString,
  frets: 24,
  level: 3,
  play: 'up',
  ...overrides,
})

describe('interval math', () => {
  it('sizes intervals from a minor second to an octave', () => {
    expect(semitonesOf('m2')).toBe(1)
    expect(semitonesOf('TT')).toBe(6)
    expect(semitonesOf('P5')).toBe(7)
    expect(semitonesOf('P8')).toBe(12)
  })

  it('plays the higher note first when descending', () => {
    const up = { interval: 'P5' as const, low: noteMidi('A1'), direction: 'up' as const }
    expect(highOf(up)).toBe(noteMidi('E2'))
    expect(firstOf(up)).toBe(noteMidi('A1'))
    expect(firstOf({ ...up, direction: 'down' })).toBe(noteMidi('E2'))
    expect(firstOf({ ...up, direction: 'together' })).toBe(noteMidi('A1'))
  })

  it('grows the pool by level', () => {
    expect(intervalsFor(1)).toEqual(['P4', 'P5', 'P8'])
    expect(intervalsFor(2)).toEqual(['m3', 'M3', 'P4', 'P5', 'm6', 'M6', 'P8'])
    expect(intervalsFor(3)).toEqual([...INTERVAL_IDS])
  })
})

describe('shapes on the neck', () => {
  const shape = (low: string, high: string) => shapeOf(noteMidi(low), noteMidi(high), fourString, 12)

  it('plays a fifth one string up, two frets over', () => {
    expect(shape('B1', 'F#2')).toEqual({ low: { string: 1, fret: 2 }, high: { string: 2, fret: 4 } })
    // Open strings count too: the lowest position wins.
    expect(shape('A1', 'E2')).toEqual({ low: { string: 1, fret: 0 }, high: { string: 2, fret: 2 } })
  })

  it('plays a fourth across the same fret', () => {
    expect(shape('C2', 'F2')).toEqual({ low: { string: 1, fret: 3 }, high: { string: 2, fret: 3 } })
  })

  it('plays an octave two strings up, two frets over', () => {
    expect(shape('G1', 'G2')).toEqual({ low: { string: 0, fret: 3 }, high: { string: 2, fret: 5 } })
  })

  it('keeps the upper note on the same or a higher string', () => {
    for (const id of INTERVAL_IDS) {
      for (const low of lowNotesFor(id, options())) {
        const s = shapeOf(low, low + semitonesOf(id), fourString, INTERVAL_MAX_FRET)!
        expect(s.high.string).toBeGreaterThanOrEqual(s.low.string)
        expect(openStringMidi(fourString)[s.low.string] + s.low.fret).toBe(low)
        expect(openStringMidi(fourString)[s.high.string] + s.high.fret).toBe(low + semitonesOf(id))
      }
    }
  })

  it('returns nothing when a note is off the neck', () => {
    expect(shapeOf(noteMidi('D1'), noteMidi('A1'), fourString, 12)).toBeUndefined()
  })
})

describe('interval questions', () => {
  it('stays within the level, the neck and the first 12 frets', () => {
    const random = createRandom(7)
    for (const level of [1, 2, 3] as const) {
      for (let i = 0; i < 200; i++) {
        const q = nextIntervalQuestion(options({ level, frets: 20 }), random)
        expect(intervalsFor(level)).toContain(q.interval)
        expect(shapeOf(q.low, highOf(q), fourString, INTERVAL_MAX_FRET)).toBeDefined()
      }
    }
  })

  it('gives the same questions for the same seed', () => {
    const run = (seed: number) => {
      const random = createRandom(seed)
      return Array.from({ length: 10 }, () => nextIntervalQuestion(options({ play: 'mixed' }), random))
    }
    expect(run(3)).toEqual(run(3))
  })

  it('asks missed intervals more often', () => {
    const random = createRandom(11)
    const stats = { P4: { right: 0, wrong: 8 }, P5: { right: 8, wrong: 0 }, P8: { right: 8, wrong: 0 } }
    let fourths = 0
    for (let i = 0; i < 1000; i++)
      if (nextIntervalQuestion(options({ level: 1 }), random, stats).interval === 'P4') fourths++
    expect(fourths / 1000).toBeGreaterThan(0.5)
  })

  it('never repeats the very same question', () => {
    const random = createRandom(5)
    let previous = nextIntervalQuestion(options({ level: 1 }), random)
    for (let i = 0; i < 300; i++) {
      const q = nextIntervalQuestion(options({ level: 1 }), random, {}, previous)
      expect(q.interval === previous.interval && q.low === previous.low).toBe(false)
      previous = q
    }
  })

  it('uses the chosen direction, or mixes all three', () => {
    const random = createRandom(9)
    expect(nextIntervalQuestion(options({ play: 'down' }), random).direction).toBe('down')
    const seen = new Set(
      Array.from({ length: 60 }, () => nextIntervalQuestion(options({ play: 'mixed' }), random).direction),
    )
    expect([...seen].sort()).toEqual(['down', 'together', 'up'])
  })
})

describe('positionNear', () => {
  it('finds a note next to the shape, on the same or a higher string', () => {
    // A minor sixth (F2) above an A1 on the E string, fret 5: two strings up, two frets back.
    expect(positionNear(noteMidi('F2'), { string: 0, fret: 5 }, fourString, 12)).toEqual({
      string: 2,
      fret: 3,
    })
    expect(positionNear(noteMidi('A#1'), { string: 0, fret: 5 }, fourString, 12)).toEqual({
      string: 0,
      fret: 6,
    })
  })
})
