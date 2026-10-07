import { LETTERS, noteChroma, parseNote, spell } from './notes'

/** Semitones above the tonic for each degree. */
const FORMULAS = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
} as const satisfies Record<string, readonly number[]>

export type ScaleId = keyof typeof FORMULAS
export const SCALE_IDS = Object.keys(FORMULAS) as ScaleId[]

export function isScaleId(value: string): value is ScaleId {
  return Object.hasOwn(FORMULAS, value)
}

/** The 12 selectable keys, identified by a canonical name. Spelling is resolved per scale. */
export const KEY_IDS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const
export type KeyId = (typeof KEY_IDS)[number]

export function isKeyId(value: string): value is KeyId {
  return (KEY_IDS as readonly string[]).includes(value)
}

/** Enharmonic spellings to try for each key. The first one wins on ties. */
const KEY_SPELLINGS: Record<KeyId, string[]> = {
  C: ['C'],
  'C#': ['C#', 'Db'],
  D: ['D'],
  Eb: ['Eb', 'D#'],
  E: ['E'],
  F: ['F'],
  'F#': ['F#', 'Gb'],
  G: ['G'],
  Ab: ['Ab', 'G#'],
  A: ['A'],
  Bb: ['Bb', 'A#'],
  B: ['B'],
}

/** All spellings of a key, e.g. "C#" → ["C#", "Db"]. */
export function keySpellings(key: KeyId): string[] {
  return KEY_SPELLINGS[key]
}

/** Which notes make up a scale or chord, relative to its root. */
export type NoteSetFormula = {
  /** Semitones above the root for each tone. */
  semitones: readonly number[]
  /**
   * Letter steps above the root for each tone (0 = root, 2 = third, 6 = seventh).
   * They decide the spelling: a diminished 7th is Bbb in C, not A.
   */
  degrees: readonly number[]
}

export type NoteSet = {
  tonic: string
  /** Note names in order, e.g. ["D","E","F","G","A","B","C"] or ["G","B","D","F"]. */
  notes: string[]
  /** Interval labels relative to the major scale, e.g. ["R","2","b3"] or ["R","3","5","b7"]. */
  intervals: string[]
  /** Semitones above the tonic for each tone. */
  semitones: readonly number[]
}

const MAJOR = FORMULAS.major
const SCALE_DEGREES = [0, 1, 2, 3, 4, 5, 6]

function intervalLabels({ semitones, degrees }: NoteSetFormula): string[] {
  return semitones.map((st, i) => {
    if (i === 0) return 'R'
    const degree = degrees[i]
    const diff = st - MAJOR[degree]
    return (diff < 0 ? 'b'.repeat(-diff) : '#'.repeat(diff)) + (degree + 1)
  })
}

function spellNotes(tonic: string, { semitones, degrees }: NoteSetFormula): string[] {
  const start = LETTERS.indexOf(parseNote(tonic)!.letter)
  const tonicChroma = noteChroma(tonic)
  return semitones.map((st, i) => spell(LETTERS[(start + degrees[i]) % 7], (tonicChroma + st) % 12))
}

function accidentalCount(notes: string[]): number {
  return notes.reduce((sum, n) => sum + parseNote(n)!.acc.length, 0)
}

/**
 * Resolves a key + formula into correctly spelled notes, picking the
 * enharmonic tonic that needs the fewest accidentals (Db major, C# minor).
 */
export function resolveNoteSet(key: KeyId, formula: NoteSetFormula): NoteSet {
  const [tonic, notes] = KEY_SPELLINGS[key]
    .map((t) => [t, spellNotes(t, formula)] as const)
    .reduce((best, candidate) =>
      accidentalCount(candidate[1]) < accidentalCount(best[1]) ? candidate : best,
    )
  return { tonic, notes, intervals: intervalLabels(formula), semitones: formula.semitones }
}

/** A scale uses each letter once, so its spelling never repeats a letter name. */
export function resolveScale(key: KeyId, scaleId: ScaleId): NoteSet {
  return resolveNoteSet(key, { semitones: FORMULAS[scaleId], degrees: SCALE_DEGREES })
}
