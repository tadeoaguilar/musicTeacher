import { getMeter, type MeterId, type Subdivision } from './meters'

/** One note or rest; patterns are a sequence of these filling exactly one bar. */
export type RhythmEvent = { ticks: number; rest?: boolean }

export type PatternGroup = 'basic' | 'groove'

export type Pattern = {
  id: string
  group: PatternGroup
  meters: MeterId[]
  events: RhythmEvent[]
}

const n = (ticks: number): RhythmEvent => ({ ticks })
const r = (ticks: number): RhythmEvent => ({ ticks, rest: true })
const times = (count: number, ...events: RhythmEvent[]) => Array.from({ length: count }, () => events).flat()

// Note lengths in ticks.
const W = 192
const H = 96
const DQ = 72
const Q = 48
const E = 24
const S = 12
const T = 16 // eighth-note triplet

export const PATTERNS: Pattern[] = [
  // Reading basics, 4/4
  { id: 'wholes', group: 'basic', meters: ['4/4'], events: [n(W)] },
  { id: 'halves', group: 'basic', meters: ['4/4'], events: times(2, n(H)) },
  { id: 'quarters', group: 'basic', meters: ['4/4'], events: times(4, n(Q)) },
  { id: 'eighths', group: 'basic', meters: ['4/4'], events: times(8, n(E)) },
  { id: 'sixteenths', group: 'basic', meters: ['4/4'], events: times(16, n(S)) },
  { id: 'triplets', group: 'basic', meters: ['4/4'], events: times(12, n(T)) },
  { id: 'oneAndThree', group: 'basic', meters: ['4/4'], events: times(2, n(Q), r(Q)) },
  { id: 'offbeats', group: 'basic', meters: ['4/4'], events: times(4, r(E), n(E)) },
  { id: 'gallop', group: 'basic', meters: ['4/4'], events: times(4, n(E), n(S), n(S)) },
  { id: 'reverseGallop', group: 'basic', meters: ['4/4'], events: times(4, n(S), n(S), n(E)) },
  // Reading basics, other simple meters
  { id: 'quarters', group: 'basic', meters: ['2/4'], events: times(2, n(Q)) },
  { id: 'eighths', group: 'basic', meters: ['2/4'], events: times(4, n(E)) },
  { id: 'quarters', group: 'basic', meters: ['3/4'], events: times(3, n(Q)) },
  { id: 'eighths', group: 'basic', meters: ['3/4'], events: times(6, n(E)) },
  // Reading basics, compound meters
  ...(['6/8', '9/8', '12/8'] as const).flatMap((meter): Pattern[] => {
    const beats = getMeter(meter).beats
    return [
      { id: 'dottedQuarters', group: 'basic', meters: [meter], events: times(beats, n(DQ)) },
      { id: 'compoundEighths', group: 'basic', meters: [meter], events: times(beats * 3, n(E)) },
      { id: 'quarterEighth', group: 'basic', meters: [meter], events: times(beats, n(Q), n(E)) },
    ]
  }),
  // Bass grooves
  { id: 'motown', group: 'groove', meters: ['4/4'], events: [n(DQ), n(E), n(Q), n(Q)] },
  {
    id: 'funk',
    group: 'groove',
    meters: ['4/4'],
    events: [n(S), r(E), n(S), r(E), n(E), n(S), n(S), r(E), r(E), n(E)],
  },
  { id: 'oneDrop', group: 'groove', meters: ['4/4'], events: [r(Q), n(E), n(E), n(Q), r(Q)] },
  { id: 'tumbao', group: 'groove', meters: ['4/4'], events: [r(Q), r(E), n(E), r(Q), n(Q)] },
  { id: 'bossa', group: 'groove', meters: ['4/4'], events: [n(DQ), n(E), n(DQ), n(E)] },
  { id: 'waltz', group: 'groove', meters: ['3/4'], events: [n(Q), r(Q), r(Q)] },
  { id: 'shuffle', group: 'groove', meters: ['12/8'], events: times(4, n(Q), n(E)) },
  { id: 'afro68', group: 'groove', meters: ['6/8'], events: [n(E), r(E), n(E), n(Q), n(E)] },
]

export function patternsFor(meter: MeterId): Pattern[] {
  return PATTERNS.filter((p) => p.meters.includes(meter))
}

export function findPattern(meter: MeterId, id: string): Pattern | undefined {
  return patternsFor(meter).find((p) => p.id === id)
}

/** The rhythm the clicks spell out when no pattern is chosen, so there is always something to read. */
export function subdivisionPattern(meterId: MeterId, sub: Subdivision): Pattern {
  const meter = getMeter(meterId)
  const ticks = meter.beatTicks / sub
  return {
    id: `sub-${sub}`,
    group: 'basic',
    meters: [meterId],
    events: times(meter.beats * sub, n(ticks)),
  }
}

/** Start tick of each event. */
export function eventStarts(events: RhythmEvent[]): number[] {
  let t = 0
  return events.map((e) => {
    const start = t
    t += e.ticks
    return start
  })
}
