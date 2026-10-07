import type { NoteSetFormula } from './scales'

export type ChordGroup = 'triad' | 'seventh' | 'sixth'

type Chord = NoteSetFormula & {
  /** Suffix after the root in a chord symbol, e.g. "m7b5" in Bm7b5. */
  symbol: string
  group: ChordGroup
}

/** Chord tones, in the order an arpeggio plays them. */
const CHORDS = {
  maj: { semitones: [0, 4, 7], degrees: [0, 2, 4], symbol: '', group: 'triad' },
  min: { semitones: [0, 3, 7], degrees: [0, 2, 4], symbol: 'm', group: 'triad' },
  dim: { semitones: [0, 3, 6], degrees: [0, 2, 4], symbol: '°', group: 'triad' },
  aug: { semitones: [0, 4, 8], degrees: [0, 2, 4], symbol: '+', group: 'triad' },
  sus4: { semitones: [0, 5, 7], degrees: [0, 3, 4], symbol: 'sus4', group: 'triad' },
  maj7: { semitones: [0, 4, 7, 11], degrees: [0, 2, 4, 6], symbol: 'maj7', group: 'seventh' },
  dom7: { semitones: [0, 4, 7, 10], degrees: [0, 2, 4, 6], symbol: '7', group: 'seventh' },
  m7: { semitones: [0, 3, 7, 10], degrees: [0, 2, 4, 6], symbol: 'm7', group: 'seventh' },
  m7b5: { semitones: [0, 3, 6, 10], degrees: [0, 2, 4, 6], symbol: 'm7b5', group: 'seventh' },
  dim7: { semitones: [0, 3, 6, 9], degrees: [0, 2, 4, 6], symbol: '°7', group: 'seventh' },
  maj6: { semitones: [0, 4, 7, 9], degrees: [0, 2, 4, 5], symbol: '6', group: 'sixth' },
  m6: { semitones: [0, 3, 7, 9], degrees: [0, 2, 4, 5], symbol: 'm6', group: 'sixth' },
} as const satisfies Record<string, Chord>

export type ChordId = keyof typeof CHORDS
export const CHORD_IDS = Object.keys(CHORDS) as ChordId[]

export function isChordId(value: string): value is ChordId {
  return Object.hasOwn(CHORDS, value)
}

export function getChord(id: ChordId): Chord {
  return CHORDS[id]
}
