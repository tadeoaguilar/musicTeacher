import { describe, expect, it } from 'vitest'
import { noteMidi } from '../theory/notes'
import { getTuning } from '../theory/tunings'
import {
  candidates,
  judge,
  maxFretFor,
  nextQuestion,
  otherOctaves,
  pitchClassOf,
  positionsOf,
  type FindNoteOptions,
} from './findNote'
import { EMPTY_SCORE, addToScore, recordAnswer, weakest, weightOf } from './progress'
import { createRandom, pickWeighted } from './random'

const fourString = getTuning('4-standard')!
const options = (level: 1 | 2 | 3): FindNoteOptions => ({ tuning: fourString, frets: 24, level })

describe('random', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = createRandom(42)
    const b = createRandom(42)
    expect(Array.from({ length: 5 }, a)).toEqual(Array.from({ length: 5 }, b))
  })

  it('picks heavier items more often', () => {
    const random = createRandom(1)
    let heavy = 0
    for (let i = 0; i < 2000; i++)
      if (pickWeighted(['a', 'b'], (x) => (x === 'a' ? 3 : 1), random) === 'a') heavy++
    expect(heavy / 2000).toBeCloseTo(0.75, 1)
  })
})

describe('find the note: questions', () => {
  it('keeps level 1 to natural notes in the first five frets', () => {
    const midis = candidates(options(1))
    expect(midis.every((m) => !pitchClassOf(m).match(/[#b]/))).toBe(true)
    expect(Math.min(...midis)).toBe(noteMidi('E1'))
    expect(Math.max(...midis)).toBe(noteMidi('C3')) // G string, fret 5
  })

  it('opens up all notes to fret 12, then the whole neck', () => {
    expect(maxFretFor(options(2))).toBe(12)
    expect(candidates(options(2))).toContain(noteMidi('F#1'))
    expect(Math.max(...candidates(options(3)))).toBe(noteMidi('G4')) // G string, fret 24
    expect(maxFretFor({ level: 3, frets: 21 })).toBe(21)
  })

  it('stays in range, never repeats a pitch twice in a row, and is deterministic', () => {
    const run = () => {
      const random = createRandom(7)
      const asked = []
      let q = nextQuestion(options(1), random)
      for (let i = 0; i < 50; i++) {
        const next = nextQuestion(options(1), random, {}, q)
        expect(next.midi).not.toBe(q.midi)
        expect(candidates(options(1))).toContain(next.midi)
        asked.push((q = next).midi)
      }
      return asked
    }
    expect(run()).toEqual(run())
  })

  it('asks about missed notes more often', () => {
    const stats = { F: { right: 0, wrong: 6 }, C: { right: 8, wrong: 0 } }
    const random = createRandom(3)
    const counts = { F: 0, C: 0 }
    for (let i = 0; i < 3000; i++) {
      const pc = nextQuestion(options(1), random, stats).pitchClass
      if (pc === 'F' || pc === 'C') counts[pc]++
    }
    expect(counts.F).toBeGreaterThan(counts.C * 2)
  })
})

describe('find the note: answers', () => {
  const a1 = { midi: noteMidi('A1'), pitchClass: 'A' as const }

  it('accepts the exact pitch on any string', () => {
    expect(judge(a1, noteMidi('A1'))).toBe('exact')
    expect(positionsOf(noteMidi('A1'), fourString, 12)).toEqual([
      { string: 0, fret: 5 },
      { string: 1, fret: 0 },
    ])
  })

  it('counts the right note in another octave, and says which way', () => {
    expect(judge(a1, noteMidi('A2'))).toBe('higher')
    expect(judge({ midi: noteMidi('A2'), pitchClass: 'A' }, noteMidi('A1'))).toBe('lower')
    expect(otherOctaves(noteMidi('A1'), fourString, 12)).toEqual([
      { string: 1, fret: 12 },
      { string: 2, fret: 7 },
      { string: 3, fret: 2 },
    ])
  })

  it('rejects other notes', () => {
    expect(judge(a1, noteMidi('Bb1'))).toBe('wrong')
  })
})

describe('progress', () => {
  it('tracks score and streaks', () => {
    let s = EMPTY_SCORE
    for (const correct of [true, true, false, true]) s = addToScore(s, correct)
    expect(s).toEqual({ right: 3, total: 4, streak: 1, best: 2 })
  })

  it('weights missed items above new ones, and known ones below', () => {
    let stats = recordAnswer({}, 'F', false)
    stats = recordAnswer(stats, 'F', false)
    for (let i = 0; i < 5; i++) stats = recordAnswer(stats, 'C', true)
    expect(weightOf(stats, 'F')).toBeGreaterThan(weightOf(stats, 'G'))
    expect(weightOf(stats, 'G')).toBeGreaterThan(weightOf(stats, 'C'))
  })

  it('lists the weakest items first', () => {
    const stats = { F: { right: 1, wrong: 3 }, B: { right: 3, wrong: 1 }, C: { right: 5, wrong: 0 } }
    expect(weakest(stats)).toEqual(['F', 'B'])
  })
})
