import { openStringMidi } from '../theory/fretboard'
import type { Tuning } from '../theory/tunings'
import type { Level, Position } from './findNote'
import { weightOf, type ItemStats } from './progress'
import { pickWeighted, type Random } from './random'

/** Intervals up to an octave, by size. `TT` is the tritone. */
export const INTERVAL_IDS = ['m2', 'M2', 'm3', 'M3', 'P4', 'TT', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'] as const
export type IntervalId = (typeof INTERVAL_IDS)[number]

export const isIntervalId = (value: unknown): value is IntervalId =>
  (INTERVAL_IDS as readonly unknown[]).includes(value)

export const semitonesOf = (id: IntervalId): number => INTERVAL_IDS.indexOf(id) + 1

/** How a bassist labels the upper note of the shape: "5", "♭3", "♭5" for the tritone. */
export const DEGREE_LABELS: Record<IntervalId, string> = {
  m2: 'b2',
  M2: '2',
  m3: 'b3',
  M3: '3',
  P4: '4',
  TT: 'b5',
  P5: '5',
  m6: 'b6',
  M6: '6',
  m7: 'b7',
  M7: '7',
  P8: '8',
}

/** Level 1: the open, stable sounds; level 2 adds thirds and sixths; level 3 is everything. */
export function intervalsFor(level: Level): IntervalId[] {
  if (level === 1) return ['P4', 'P5', 'P8']
  if (level === 2) return ['m3', 'M3', 'P4', 'P5', 'm6', 'M6', 'P8']
  return [...INTERVAL_IDS]
}

/** How the two notes are played. 'mixed' (a setting, not a question) picks one at random each time. */
export const DIRECTIONS = ['up', 'down', 'together'] as const
export type IntervalDirection = (typeof DIRECTIONS)[number]
export const PLAY_MODES = [...DIRECTIONS, 'mixed'] as const
export type PlayMode = (typeof PLAY_MODES)[number]

export type IntervalOptions = {
  tuning: Tuning
  frets: number
  level: Level
  play: PlayMode
}

export type IntervalQuestion = {
  interval: IntervalId
  /** The lower of the two notes (MIDI). */
  low: number
  direction: IntervalDirection
}

/**
 * Notes stay within the first 12 frets: that's where the shapes are learned, and
 * it keeps the sound in the bass's natural register.
 */
export const INTERVAL_MAX_FRET = 12

export const highOf = (q: IntervalQuestion) => q.low + semitonesOf(q.interval)

/** The note played first (the reference): the higher one when descending. */
export const firstOf = (q: IntervalQuestion) => (q.direction === 'down' ? highOf(q) : q.low)

export type Shape = { low: Position; high: Position }

/**
 * Where to play an interval as one hand shape: the upper note on the same or a
 * higher string, with the smallest stretch, as low on the neck as possible.
 * A fifth comes out as "one string up, two frets over".
 */
export function shapeOf(low: number, high: number, tuning: Tuning, maxFret: number): Shape | undefined {
  const opens = openStringMidi(tuning)
  let best: { shape: Shape; cost: number } | undefined
  opens.forEach((lowOpen, ls) => {
    const lf = low - lowOpen
    if (lf < 0 || lf > maxFret) return
    for (let hs = ls; hs < opens.length; hs++) {
      const hf = high - opens[hs]
      if (hf < 0 || hf > maxFret) continue
      const cost = Math.abs(hf - lf) * 10 + (hs - ls) + Math.min(lf, hf) * 0.1
      if (!best || cost < best.cost)
        best = { shape: { low: { string: ls, fret: lf }, high: { string: hs, fret: hf } }, cost }
    }
  })
  return best?.shape
}

/** Lower notes the interval can start from, so that the whole shape fits on the neck. */
export function lowNotesFor(
  interval: IntervalId,
  options: Pick<IntervalOptions, 'tuning' | 'frets'>,
): number[] {
  const maxFret = Math.min(options.frets, INTERVAL_MAX_FRET)
  const opens = openStringMidi(options.tuning)
  const lows: number[] = []
  for (let m = Math.min(...opens); m <= Math.max(...opens) + maxFret; m++) {
    if (shapeOf(m, m + semitonesOf(interval), options.tuning, maxFret)) lows.push(m)
  }
  return lows
}

/**
 * A new question. Intervals you miss come up more often; the starting note is
 * random, and never the very same question twice in a row.
 */
export function nextIntervalQuestion(
  options: IntervalOptions,
  random: Random,
  stats: ItemStats = {},
  previous?: IntervalQuestion,
): IntervalQuestion {
  const interval = pickWeighted(intervalsFor(options.level), (id) => weightOf(stats, id), random)
  const lows = lowNotesFor(interval, options)
  const pool =
    lows.length > 1 ? lows.filter((m) => !(interval === previous?.interval && m === previous.low)) : lows
  const low = pool[Math.floor(random() * pool.length)]
  const direction =
    options.play === 'mixed' ? DIRECTIONS[Math.floor(random() * DIRECTIONS.length)] : options.play
  return { interval, low, direction }
}

/**
 * Where a note sits relative to a shape's lower note: on the same or a higher
 * string, closest in frets. Used to show a wrong answer next to the right one.
 */
export function positionNear(
  midi: number,
  from: Position,
  tuning: Tuning,
  maxFret: number,
): Position | undefined {
  const opens = openStringMidi(tuning)
  let best: { position: Position; cost: number } | undefined
  for (let string = from.string; string < opens.length; string++) {
    const fret = midi - opens[string]
    if (fret < 0 || fret > maxFret) continue
    const cost = Math.abs(fret - from.fret) * 10 + (string - from.string)
    if (!best || cost < best.cost) best = { position: { string, fret }, cost }
  }
  return best?.position
}
