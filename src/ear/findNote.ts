import { openStringMidi } from '../theory/fretboard'
import { KEY_IDS, type KeyId } from '../theory/scales'
import type { Tuning } from '../theory/tunings'
import { weightOf, type ItemStats } from './progress'
import { pickWeighted, type Random } from './random'

export type Level = 1 | 2 | 3
export const LEVELS: Level[] = [1, 2, 3]

export type FindNoteOptions = {
  tuning: Tuning
  /** Frets on the bass; level 3 uses all of them. */
  frets: number
  level: Level
}

export type FindNoteQuestion = {
  midi: number
  /** Pitch class, spelled as a key: "C#" covers C♯/D♭. */
  pitchClass: KeyId
}

export type Position = { string: number; fret: number }

/** The highest fret a level asks about. */
export function maxFretFor({ level, frets }: Pick<FindNoteOptions, 'level' | 'frets'>): number {
  return Math.min(frets, level === 1 ? 5 : level === 2 ? 12 : frets)
}

const NATURAL = new Set([0, 2, 4, 5, 7, 9, 11])

export const pitchClassOf = (midi: number): KeyId => KEY_IDS[((midi % 12) + 12) % 12]

/** Every pitch the level can ask for: playable within its frets, natural notes only on level 1. */
export function candidates(options: FindNoteOptions): number[] {
  const maxFret = maxFretFor(options)
  const midis = new Set<number>()
  for (const open of openStringMidi(options.tuning)) {
    for (let fret = 0; fret <= maxFret; fret++) midis.add(open + fret)
  }
  return [...midis]
    .filter((m) => options.level > 1 || NATURAL.has(((m % 12) + 12) % 12))
    .sort((a, b) => a - b)
}

/**
 * A new question, never the same pitch twice in a row. Notes you miss come up
 * more often: the weight is per pitch class, since that's what you learn.
 */
export function nextQuestion(
  options: FindNoteOptions,
  random: Random,
  stats: ItemStats = {},
  previous?: FindNoteQuestion,
): FindNoteQuestion {
  const pool = candidates(options).filter((m) => m !== previous?.midi)
  const midi = pickWeighted(pool, (m) => weightOf(stats, pitchClassOf(m)), random)
  return { midi, pitchClass: pitchClassOf(midi) }
}

/** Where a pitch is on the neck, up to maxFret. */
export function positionsOf(midi: number, tuning: Tuning, maxFret: number): Position[] {
  return openStringMidi(tuning).flatMap((open, string) => {
    const fret = midi - open
    return fret >= 0 && fret <= maxFret ? [{ string, fret }] : []
  })
}

/** Where the same note sounds in other octaves, up to maxFret. */
export function otherOctaves(midi: number, tuning: Tuning, maxFret: number): Position[] {
  return openStringMidi(tuning).flatMap((open, string) => {
    const result: Position[] = []
    for (let fret = 0; fret <= maxFret; fret++) {
      const m = open + fret
      if (m !== midi && (m - midi) % 12 === 0) result.push({ string, fret })
    }
    return result
  })
}

/**
 * 'exact': the pitch you heard. 'higher' / 'lower': the right note in another
 * octave (still correct: you found the note; the octave is the ear part).
 */
export type Verdict = 'exact' | 'higher' | 'lower' | 'wrong'

export function judge(question: FindNoteQuestion, tappedMidi: number): Verdict {
  if (tappedMidi === question.midi) return 'exact'
  if ((tappedMidi - question.midi) % 12 !== 0) return 'wrong'
  return tappedMidi > question.midi ? 'higher' : 'lower'
}

export const isCorrect = (verdict: Verdict) => verdict !== 'wrong'
