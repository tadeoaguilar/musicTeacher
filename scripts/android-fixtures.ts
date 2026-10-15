// Runs the web app's pure logic (src/theory, rhythm, ear, pitch) over many inputs and returns the
// results. scripts/android-fixtures.mjs writes them as JSON for the Android port's tests
// (android/core/src/test/resources/fixtures), which must reproduce every value.

import { addToScore, EMPTY_SCORE, recordAnswer, weakest, weightOf, type ItemStats } from '../src/ear/progress'
import { candidates, judge, maxFretFor, nextQuestion, otherOctaves, positionsOf } from '../src/ear/findNote'
import {
  INTERVAL_IDS,
  PLAY_MODES,
  intervalsFor,
  lowNotesFor,
  nextIntervalQuestion,
  positionNear,
  semitonesOf,
  shapeOf,
} from '../src/ear/intervals'
import { createRandom, pickWeighted } from '../src/ear/random'
import { detectPitch, downsample, rms } from '../src/pitch/detect'
import { MAX_HZ, MIN_HZ, createSmoother, matchString, readNote } from '../src/pitch/tuner'
import { buildBar, cycleAccent, defaultAccents, swingPosition, type Accent } from '../src/rhythm/bar'
import { METER_IDS, canSwing, getMeter, subdivisionsFor } from '../src/rhythm/meters'
import { layoutRhythm, validatePattern } from '../src/rhythm/notation'
import { PATTERNS, eventStarts, patternsFor, subdivisionPattern } from '../src/rhythm/patterns'
import { tapTempo } from '../src/rhythm/tapTempo'
import { barPlan, type TrainerSettings } from '../src/rhythm/trainer'
import { CHORD_IDS, getChord } from '../src/theory/chords'
import { getFretboardNotes, openStringMidi, type FretNote } from '../src/theory/fretboard'
import { formatInterval, formatNote, midiToFrequency, noteMidi, spell, LETTERS } from '../src/theory/notes'
import { KEY_IDS, SCALE_IDS, resolveNoteSet, resolveScale } from '../src/theory/scales'
import { DIRECTIONS, OCTAVES, buildPlaySequence } from '../src/theory/sequence'
import { FRET_COUNTS, TUNINGS, getTuning } from '../src/theory/tunings'

/** Compact fret note: [string, fret, midi, name, interval, degree, isRoot, isStart]. */
const fretNote = (n: FretNote) => [
  n.string,
  n.fret,
  n.midi,
  n.name,
  n.interval,
  n.degree,
  n.isRoot ? 1 : 0,
  n.isStart ? 1 : 0,
]

function theory() {
  const noteSets: [string, ReturnType<typeof resolveScale>][] = [
    ['C major', resolveScale('C', 'major')],
    ['F# dorian', resolveScale('F#', 'dorian')],
    ['Bb locrian', resolveScale('Bb', 'locrian')],
    ['G dom7', resolveNoteSet('G', getChord('dom7'))],
    ['C# dim7', resolveNoteSet('C#', getChord('dim7'))],
    ['E m6', resolveNoteSet('E', getChord('m6'))],
  ]
  return {
    letters: LETTERS,
    spell: LETTERS.flatMap((l) => Array.from({ length: 12 }, (_, c) => [l, c, spell(l, c)])),
    format: ['C', 'F#', 'Bb', 'Ebb', 'G##', 'B2', 'x'].map((n) => [
      n,
      formatNote(n, 'en'),
      formatNote(n, 'es'),
    ]),
    formatInterval: ['R', 'b3', '#4', 'bb7'].map((l) => [l, formatInterval(l)]),
    frequencies: [0, 23, 28, 33, 45, 69, 81].flatMap((m) =>
      [440, 432, 446].map((a4) => [m, a4, midiToFrequency(m, a4)]),
    ),
    scales: KEY_IDS.flatMap((key) => SCALE_IDS.map((id) => ({ key, id, ...resolveScale(key, id) }))),
    chords: CHORD_IDS.map((id) => ({ id, ...getChord(id) })),
    chordSets: KEY_IDS.flatMap((key) =>
      CHORD_IDS.map((id) => ({ key, id, ...resolveNoteSet(key, getChord(id)) })),
    ),
    tunings: TUNINGS.map((t) => ({ ...t, open: openStringMidi(t) })),
    fretboards: TUNINGS.flatMap((tuning) =>
      noteSets.map(([name, set]) => {
        const notes = getFretboardNotes(tuning, 24, set)
        return {
          tuning: tuning.id,
          set: name,
          notes: notes.map(fretNote),
          sequences: DIRECTIONS.flatMap((dir) =>
            [false, true].flatMap((loop) =>
              OCTAVES.map((oct) => ({
                dir,
                loop,
                oct,
                positions: buildPlaySequence(notes, dir, loop, oct).map((n) => `${n.string}-${n.fret}`),
              })),
            ),
          ),
        }
      }),
    ),
    fretCounts: FRET_COUNTS.map((frets) => ({
      frets,
      count: getFretboardNotes(getTuning('4-standard')!, frets, resolveScale('A', 'minor')).length,
    })),
  }
}

function rhythm() {
  const accentSets = (beats: number): Accent[][] => [
    defaultAccents(beats),
    Array.from({ length: beats }, (_, i) => (['S', 'A', 'N'] as const)[i % 3]),
  ]
  const bars = METER_IDS.flatMap((meter) => {
    const m = getMeter(meter)
    return subdivisionsFor(m).flatMap((sub) =>
      [0, 0.5, 1].flatMap((swing) =>
        accentSets(m.beats).flatMap((accents) =>
          [undefined, ...patternsFor(meter)].map((pattern) => ({
            meter,
            sub,
            swing,
            accents,
            pattern: pattern?.id ?? null,
            events: buildBar({ meter, sub, swing, accents, pattern }).map((e) =>
              e.kind === 'bass' ? [e.kind, e.at, e.beat, e.duration, e.index] : [e.kind, e.at, e.beat],
            ),
          })),
        ),
      ),
    )
  })
  const layouts = METER_IDS.flatMap((meter) =>
    [...patternsFor(meter), ...subdivisionsFor(getMeter(meter)).map((s) => subdivisionPattern(meter, s))].map(
      (p) => ({ meter, pattern: p.id, layout: layoutRhythm(p, meter), errors: validatePattern(p, meter) }),
    ),
  )
  const trainers: TrainerSettings[] = [
    { bpm: 60, countIn: false, speed: undefined, gap: undefined },
    { bpm: 60, countIn: true, speed: undefined, gap: undefined },
    { bpm: 60, countIn: false, speed: { target: 70, step: 5, every: 4 }, gap: undefined },
    { bpm: 100, countIn: true, speed: { target: 80, step: 3, every: 2 }, gap: { play: 2, mute: 1 } },
    { bpm: 90, countIn: false, speed: { target: 90, step: 5, every: 4 }, gap: { play: 3, mute: 2 } },
    { bpm: 90, countIn: false, speed: { target: 120, step: 0, every: 4 }, gap: { play: 0, mute: 2 } },
  ]
  let taps: number[] = []
  const tapSequence = [0, 500, 1000, 1500, 2100, 2600, 6000, 6400, 6800, 7300, 7700, 8100].map((now) => {
    const state = tapTempo(taps, now)
    taps = state.taps
    return [now, state.taps, state.bpm ?? null]
  })
  return {
    meters: METER_IDS.map((id) => ({
      ...getMeter(id),
      subdivisions: subdivisionsFor(getMeter(id)),
      swingable: subdivisionsFor(getMeter(id)).filter((s) => canSwing(getMeter(id), s)),
    })),
    patterns: PATTERNS.map((p) => ({ ...p, starts: eventStarts(p.events) })),
    subdivisionPatterns: METER_IDS.flatMap((meter) =>
      subdivisionsFor(getMeter(meter)).map((sub) => ({
        meter,
        sub,
        pattern: subdivisionPattern(meter, sub),
      })),
    ),
    cycleAccent: (['A', 'N', 'S'] as const).map((a) => [a, cycleAccent(a)]),
    swing: [0, 0.25, 0.5, 0.75, 1, 1.5, 2.5].flatMap((at) =>
      [0.5, 0.25].flatMap((unit) =>
        [0.3, 1].map((amount) => [at, unit, amount, swingPosition(at, unit, amount)]),
      ),
    ),
    bars,
    layouts,
    plans: trainers.map((settings) => ({
      settings,
      plans: Array.from({ length: 16 }, (_, i) => barPlan(i, settings)),
    })),
    taps: tapSequence,
  }
}

function ear() {
  const fourString = getTuning('4-standard')!
  const stats: ItemStats = {
    F: { right: 0, wrong: 6 },
    C: { right: 8, wrong: 0 },
    P4: { right: 1, wrong: 3 },
  }
  const random = createRandom(42)
  const weighted = Array.from({ length: 50 }, () =>
    pickWeighted(['a', 'b', 'c'], (x) => (x === 'a' ? 3 : 1), random),
  )
  let score = EMPTY_SCORE
  let recorded: ItemStats = {}
  const answers = [true, true, false, true, false, false, true].map((c, i) => {
    score = addToScore(score, c)
    recorded = recordAnswer(recorded, ['F', 'C', 'F', 'G'][i % 4], c)
    return { score, recorded }
  })
  const questionRuns = TUNINGS.filter((t) =>
    ['4-standard', '5-standard', '6-standard'].includes(t.id),
  ).flatMap((tuning) =>
    ([1, 2, 3] as const).map((level) => {
      const options = { tuning, frets: 22, level }
      const r = createRandom(level * 100 + tuning.strings.length)
      let q = nextQuestion(options, r, stats)
      const asked = [q]
      for (let i = 0; i < 30; i++) asked.push((q = nextQuestion(options, r, stats, q)))
      return { tuning: tuning.id, level, candidates: candidates(options), max: maxFretFor(options), asked }
    }),
  )
  const intervalRuns = ['4-standard', '5-high-c'].flatMap((id) =>
    ([1, 2, 3] as const).flatMap((level) =>
      PLAY_MODES.map((play) => {
        const options = { tuning: getTuning(id)!, frets: 24, level, play }
        const r = createRandom(level * 10 + play.length)
        let q = nextIntervalQuestion(options, r, stats)
        const asked = [q]
        for (let i = 0; i < 25; i++) asked.push((q = nextIntervalQuestion(options, r, stats, q)))
        return { tuning: id, level, play, asked }
      }),
    ),
  )
  return {
    random: [1, 7, 42, 4294967295].map((seed) => {
      const r = createRandom(seed)
      return { seed, values: Array.from({ length: 20 }, r) }
    }),
    weighted,
    answers,
    weights: ['F', 'C', 'P4', 'new'].map((item) => [item, weightOf(stats, item)]),
    weakest: weakest({ ...stats, B: { right: 3, wrong: 1 }, E: { right: 1, wrong: 3 } }),
    questionRuns,
    positions: [28, 33, 40, 45, 55, 67].map((m) => ({
      midi: m,
      positions: positionsOf(m, fourString, 24),
      octaves: otherOctaves(m, fourString, 24),
    })),
    judge: [
      [33, 33],
      [33, 45],
      [45, 33],
      [33, 34],
      [33, 57],
    ].map(([q, tapped]) => [q, tapped, judge({ midi: q, pitchClass: 'A' }, tapped)]),
    intervals: INTERVAL_IDS.map((id) => ({
      id,
      semitones: semitonesOf(id),
      lows: lowNotesFor(id, { tuning: fourString, frets: 24 }),
      lowsFive: lowNotesFor(id, { tuning: getTuning('5-standard')!, frets: 20 }),
    })),
    levels: ([1, 2, 3] as const).map((level) => intervalsFor(level)),
    shapes: INTERVAL_IDS.flatMap((id) =>
      lowNotesFor(id, { tuning: fourString, frets: 24 }).map((low) => ({
        low,
        high: low + semitonesOf(id),
        shape: shapeOf(low, low + semitonesOf(id), fourString, 12) ?? null,
      })),
    ),
    near: [
      [noteMidi('F2'), 0, 5],
      [noteMidi('A#1'), 0, 5],
      [noteMidi('G2'), 1, 3],
      [noteMidi('C1'), 0, 0],
    ].map(([m, string, fret]) => ({
      midi: m,
      from: { string, fret },
      near: positionNear(m, { string, fret }, fourString, 12) ?? null,
    })),
    intervalRuns,
  }
}

const RATE = 48000
const FACTOR = 4
const WINDOW = 8192

function bassTone(hz: number, harmonics = [0.3, 1, 0.6, 0.3, 0.15], gain = 0.2) {
  const out = new Float32Array(WINDOW)
  for (let i = 0; i < WINDOW; i++) {
    let v = 0
    harmonics.forEach((amp, h) => (v += amp * Math.sin((2 * Math.PI * hz * (h + 1) * i) / RATE + h)))
    out[i] = gain * v
  }
  return out
}

function roomNoise(seed: number, level: number) {
  let state = seed
  const random = () => (state = (state * 16807) % 2147483647) / 2147483647
  return new Float32Array(WINDOW).map((_, i) => {
    const gauss = Math.sqrt(-2 * Math.log(random() + 1e-12)) * Math.cos(2 * Math.PI * random())
    const hum = 0.3 * Math.sin((2 * Math.PI * 60 * i) / RATE) + 0.2 * Math.sin((2 * Math.PI * 120 * i) / RATE)
    return level * (gauss + hum)
  })
}

function pitch() {
  const signals: [string, Float32Array][] = [
    ['A0 sine', bassTone(midiToFrequency(noteMidi('A0')), [1])],
    ['E1 bass', bassTone(midiToFrequency(noteMidi('E1')))],
    ['flat A1', bassTone(55 * 2 ** (-12 / 1200))],
    ['C3 bass', bassTone(midiToFrequency(noteMidi('C3')))],
    [
      'quiet G2 + noise',
      bassTone(midiToFrequency(noteMidi('G2')), undefined, 0.003).map(
        (v, i) => v + roomNoise(3, 0.003 / Math.sqrt(10))[i],
      ),
    ],
    ['room noise', roomNoise(1, 0.15)],
    ['quiet hum', roomNoise(5, 0.002)],
    ['silence', new Float32Array(WINDOW)],
  ]
  const smoother = createSmoother()
  const smoothed = [
    55,
    55.1,
    54.9,
    55,
    110,
    null,
    null,
    73.4,
    73.4,
    73.4,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    41,
  ].map((hz) => [hz, smoother.push(hz)])
  return {
    downsample: { input: Array.from({ length: 20 }, (_, i) => Math.fround(Math.sin(i))), factors: [1, 3, 4] },
    downsampled: [1, 3, 4].map((f) =>
      Array.from(
        downsample(
          Float32Array.from({ length: 20 }, (_, i) => Math.sin(i)),
          f,
        ),
      ),
    ),
    detections: signals.map(([name, samples]) => {
      const input = downsample(samples, FACTOR)
      const p = detectPitch(input, RATE / FACTOR, { minHz: MIN_HZ, maxHz: MAX_HZ })
      return {
        name,
        rms: rms(input),
        input: Array.from(input),
        hz: p?.hz ?? null,
        clarity: p?.clarity ?? null,
      }
    }),
    readings: [27.5, 30.87, 41.2, 54, 55, 56, 98, 110.5, 261.6, 499].flatMap((hz) =>
      [440, 432].map((a4) => ({ hz, a4, ...readNote(hz, a4) })),
    ),
    strings: TUNINGS.flatMap((t) =>
      [23, 26, 28, 33, 38, 43, 48].map((m) => [t.id, m, matchString(m, t) ?? null]),
    ),
    smoothed,
  }
}

export function fixtures(): Record<string, unknown> {
  return { theory: theory(), rhythm: rhythm(), ear: ear(), pitch: pitch() }
}
