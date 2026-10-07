import { describe, expect, it } from 'vitest'
import { buildBar, defaultAccents, swingPosition } from './bar'
import { METER_IDS, getMeter, subdivisionsFor } from './meters'
import { layoutRhythm, validatePattern } from './notation'
import { PATTERNS, findPattern, subdivisionPattern } from './patterns'
import { tapTempo } from './tapTempo'
import { barPlan } from './trainer'

const clicks = (events: ReturnType<typeof buildBar>) =>
  events.filter((e) => e.kind !== 'bass').map((e) => [e.kind, +e.at.toFixed(4)])

describe('meters', () => {
  it('counts dotted-quarter pulses in compound meters', () => {
    expect(getMeter('6/8')).toMatchObject({ beats: 2, compound: true, beatTicks: 72, barTicks: 144 })
    expect(getMeter('12/8').beats).toBe(4)
    expect(getMeter('3/4')).toMatchObject({ beats: 3, compound: false, barTicks: 144 })
  })
})

describe('buildBar', () => {
  const base = {
    meter: '4/4' as const,
    sub: 1 as const,
    swing: 0,
    accents: defaultAccents(4),
    pattern: undefined,
  }

  it('clicks every beat with an accent on one', () => {
    expect(clicks(buildBar(base))).toEqual([
      ['accent', 0],
      ['normal', 1],
      ['normal', 2],
      ['normal', 3],
    ])
  })

  it('adds subdivision clicks and skips silent beats entirely', () => {
    const bar = buildBar({ ...base, sub: 2, accents: ['S', 'A', 'S', 'A'] })
    expect(clicks(bar)).toEqual([
      ['accent', 1],
      ['sub', 1.5],
      ['accent', 3],
      ['sub', 3.5],
    ])
  })

  it('places triplets and compound eighths at thirds of the beat', () => {
    expect(clicks(buildBar({ ...base, meter: '2/4', sub: 3, accents: defaultAccents(2) }))).toEqual([
      ['accent', 0],
      ['sub', 0.3333],
      ['sub', 0.6667],
      ['normal', 1],
      ['sub', 1.3333],
      ['sub', 1.6667],
    ])
    expect(buildBar({ ...base, meter: '6/8', sub: 3, accents: defaultAccents(2) })).toHaveLength(6)
  })

  it('swings off-beats up to triplet timing', () => {
    expect(swingPosition(0.5, 0.5, 1)).toBeCloseTo(2 / 3)
    expect(swingPosition(0.5, 0.5, 0.5)).toBeCloseTo(0.5 + 1 / 12)
    expect(swingPosition(1, 0.5, 1)).toBe(1)
    expect(swingPosition(0.25, 0.25, 1)).toBeCloseTo(1 / 3)
    const bar = buildBar({ ...base, sub: 2, swing: 1 })
    expect(bar.filter((e) => e.kind === 'sub').map((e) => e.at)).toEqual(
      [2, 5, 8, 11].map((x) => expect.closeTo(x / 3)),
    )
  })

  it('does not swing compound meters or triplets', () => {
    const bar = buildBar({ ...base, sub: 3, swing: 1 })
    expect(bar.find((e) => e.kind === 'sub')!.at).toBeCloseTo(1 / 3)
  })

  it('plays the pattern on the bass, skipping rests', () => {
    const motown = findPattern('4/4', 'motown')!
    const bass = buildBar({ ...base, pattern: motown }).filter((e) => e.kind === 'bass')
    expect(bass.map((e) => [e.at, e.kind === 'bass' && e.duration])).toEqual([
      [0, 1.5],
      [1.5, 0.5],
      [2, 1],
      [3, 1],
    ])
    const tumbao = findPattern('4/4', 'tumbao')!
    expect(
      buildBar({ ...base, pattern: tumbao })
        .filter((e) => e.kind === 'bass')
        .map((e) => e.at),
    ).toEqual([1.5, 3])
  })
})

describe('patterns', () => {
  it('every pattern fills exactly one bar and is readable', () => {
    for (const p of PATTERNS) {
      for (const meter of p.meters) expect(validatePattern(p, meter)).toEqual([])
    }
  })

  it('every subdivision pattern is readable', () => {
    for (const meter of METER_IDS) {
      for (const sub of subdivisionsFor(getMeter(meter))) {
        expect(validatePattern(subdivisionPattern(meter, sub), meter)).toEqual([])
      }
    }
  })

  it('has unique ids within each meter', () => {
    for (const meter of METER_IDS) {
      const ids = PATTERNS.filter((p) => p.meters.includes(meter)).map((p) => p.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})

describe('layoutRhythm', () => {
  it('beams eighths in pairs per beat in 4/4 and in threes in 6/8', () => {
    expect(layoutRhythm(findPattern('4/4', 'eighths')!, '4/4').beams.map((b) => b.notes)).toEqual([
      [0, 1],
      [2, 3],
      [4, 5],
      [6, 7],
    ])
    expect(
      layoutRhythm(findPattern('6/8', 'compoundEighths')!, '6/8').beams.map((b) => b.notes.length),
    ).toEqual([3, 3])
  })

  it('adds sixteenth beams, stubs and flags', () => {
    const gallop = layoutRhythm(findPattern('4/4', 'gallop')!, '4/4')
    expect(gallop.beams[0]).toEqual({ notes: [0, 1, 2], secondary: [[1, 2]], stubs: [] })

    const funk = layoutRhythm(findPattern('4/4', 'funk')!, '4/4')
    // A lone sixteenth after a rest is flagged rather than beamed.
    expect(funk.glyphs[0]).toMatchObject({ value: 'sixteenth', flagged: true })
    expect(funk.glyphs[1]).toMatchObject({ value: 'eighth', rest: true })
  })

  it('reads dotted notes and brackets triplets per beat', () => {
    const motown = layoutRhythm(findPattern('4/4', 'motown')!, '4/4')
    expect(motown.glyphs[0]).toMatchObject({ value: 'quarter', dotted: true })
    expect(motown.glyphs[1]).toMatchObject({ value: 'eighth', flagged: true })

    const triplets = layoutRhythm(findPattern('4/4', 'triplets')!, '4/4')
    expect(triplets.tuplets).toHaveLength(4)
    expect(triplets.tuplets[0]).toEqual({ first: 0, last: 2, count: 3 })
  })
})

describe('barPlan', () => {
  const base = { bpm: 60, countIn: false, speed: undefined, gap: undefined }

  it('treats bar 0 as the count-in', () => {
    expect(barPlan(0, { ...base, countIn: true })).toMatchObject({ countIn: true, bpm: 60 })
    expect(barPlan(1, { ...base, countIn: true }).countIn).toBe(false)
  })

  it('speeds up every N bars and stops at the target', () => {
    const speed = { target: 70, step: 5, every: 4 }
    const bpms = Array.from({ length: 14 }, (_, i) => barPlan(i, { ...base, speed }).bpm)
    expect(bpms).toEqual([60, 60, 60, 60, 65, 65, 65, 65, 70, 70, 70, 70, 70, 70])
    expect(barPlan(5, { ...base, speed }).barsToNextStep).toBe(3)
    expect(barPlan(9, { ...base, speed }).barsToNextStep).toBeUndefined()
  })

  it('can slow down toward a lower target', () => {
    expect(barPlan(8, { ...base, speed: { target: 50, step: 3, every: 2 } }).bpm).toBe(50)
  })

  it('mutes bars in the gap trainer, counting after the count-in', () => {
    const gap = { play: 2, mute: 1 }
    const muted = Array.from({ length: 7 }, (_, i) => barPlan(i, { ...base, countIn: true, gap }).muted)
    expect(muted).toEqual([false, false, false, true, false, false, true])
  })
})

describe('tapTempo', () => {
  it('averages tap intervals', () => {
    let state = tapTempo([], 0)
    expect(state.bpm).toBeUndefined()
    for (const t of [500, 1000, 1500]) state = tapTempo(state.taps, t)
    expect(state.bpm).toBe(120)
  })

  it('restarts after a long pause and keeps only recent taps', () => {
    expect(tapTempo([0, 500], 5000)).toEqual({ taps: [5000], bpm: undefined })
    expect(tapTempo([0, 1000, 2000, 3000, 4000], 4500).taps).toHaveLength(5)
  })
})
