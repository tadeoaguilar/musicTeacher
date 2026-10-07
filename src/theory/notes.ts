export type Locale = 'en' | 'es'

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const
export type Letter = (typeof LETTERS)[number]

export const LETTER_CHROMA: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

export type ParsedNote = { letter: Letter; acc: string; octave: number | undefined }

/** Parses "Bb", "F#2", "Ebb1". Returns undefined for anything else. */
export function parseNote(name: string): ParsedNote | undefined {
  const match = /^([A-G])(#{1,2}|b{1,2})?(-?\d+)?$/.exec(name)
  if (!match) return undefined
  return {
    letter: match[1] as Letter,
    acc: match[2] ?? '',
    octave: match[3] === undefined ? undefined : Number(match[3]),
  }
}

function accidentalOffset(acc: string): number {
  return acc.startsWith('#') ? acc.length : -acc.length
}

/** Pitch class 0-11 (C = 0). */
export function noteChroma(name: string): number {
  const n = parseNote(name)
  if (!n) throw new Error(`Invalid note: ${name}`)
  return (LETTER_CHROMA[n.letter] + accidentalOffset(n.acc) + 12) % 12
}

/** MIDI number of a note with octave, e.g. "E1" → 28. */
export function noteMidi(name: string): number {
  const n = parseNote(name)
  if (!n || n.octave === undefined) throw new Error(`Invalid note with octave: ${name}`)
  return (n.octave + 1) * 12 + LETTER_CHROMA[n.letter] + accidentalOffset(n.acc)
}

/** The accidental needed to raise/lower a letter to a pitch class, e.g. ('B', 10) → "b". */
export function spell(letter: Letter, chroma: number): string {
  const diff = ((((chroma - LETTER_CHROMA[letter]) % 12) + 18) % 12) - 6
  return letter + (diff > 0 ? '#'.repeat(diff) : 'b'.repeat(-diff))
}

const SOLFEGE: Record<Letter, string> = {
  C: 'Do',
  D: 'Re',
  E: 'Mi',
  F: 'Fa',
  G: 'Sol',
  A: 'La',
  B: 'Si',
}

function prettyAccidentals(acc: string): string {
  return acc.replace(/#/g, '♯').replace(/b/g, '♭')
}

/** "Bb" → "B♭" (en) or "Si♭" (es). Octave numbers are dropped. */
export function formatNote(name: string, locale: Locale): string {
  const n = parseNote(name)
  if (!n) return name
  return (locale === 'es' ? SOLFEGE[n.letter] : n.letter) + prettyAccidentals(n.acc)
}

/** Interval labels use the same pretty accidentals: "b3" → "♭3". */
export function formatInterval(label: string): string {
  return prettyAccidentals(label)
}

export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}
