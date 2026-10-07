import { describe, expect, it } from 'vitest'
import { getFretboardNotes, openStringMidi } from './fretboard'
import { formatInterval, formatNote } from './notes'
import { noteChroma, noteMidi, spell } from './notes'
import { resolveScale } from './scales'
import { buildPlaySequence } from './sequence'
import { getTuning } from './tunings'

const fourString = getTuning('4-standard')!

describe('resolveScale', () => {
  it('spells F major with Bb, not A#', () => {
    expect(resolveScale('F', 'major').notes).toEqual(['F', 'G', 'A', 'Bb', 'C', 'D', 'E'])
  })

  it('spells D major with sharps', () => {
    expect(resolveScale('D', 'major').notes).toEqual(['D', 'E', 'F#', 'G', 'A', 'B', 'C#'])
  })

  it('picks the enharmonic tonic with fewer accidentals', () => {
    expect(resolveScale('C#', 'major').tonic).toBe('Db')
    expect(resolveScale('C#', 'minor').tonic).toBe('C#')
    expect(resolveScale('Bb', 'major').notes).toEqual(['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'])
  })

  it('builds modes from the correct interval formulas', () => {
    expect(resolveScale('D', 'dorian').notes).toEqual(['D', 'E', 'F', 'G', 'A', 'B', 'C'])
    expect(resolveScale('C', 'lydian').semitones).toEqual([0, 2, 4, 6, 7, 9, 11])
    expect(resolveScale('C', 'locrian').semitones).toEqual([0, 1, 3, 5, 6, 8, 10])
    expect(resolveScale('A', 'minor').notes).toEqual(resolveScale('A', 'aeolian').notes)
  })
})

describe('notes', () => {
  it('converts notes to MIDI and pitch classes', () => {
    expect(noteMidi('E1')).toBe(28)
    expect(noteMidi('B0')).toBe(23)
    expect(noteMidi('Cb4')).toBe(59)
    expect(noteChroma('Bb')).toBe(10)
    expect(noteChroma('B#')).toBe(0)
  })

  it('spells a pitch class on a given letter', () => {
    expect(spell('B', 10)).toBe('Bb')
    expect(spell('E', 6)).toBe('E##')
    expect(spell('C', 11)).toBe('Cb')
  })
})

describe('intervals', () => {
  it('labels degrees relative to the major scale', () => {
    expect(resolveScale('C', 'major').intervals).toEqual(['R', '2', '3', '4', '5', '6', '7'])
    expect(resolveScale('C', 'locrian').intervals).toEqual(['R', 'b2', 'b3', '4', 'b5', 'b6', 'b7'])
    expect(resolveScale('C', 'lydian').intervals).toEqual(['R', '2', '3', '#4', '5', '6', '7'])
  })
})

describe('getFretboardNotes', () => {
  it('finds every D dorian note on a 24-fret 4-string', () => {
    const notes = getFretboardNotes(fourString, 24, resolveScale('D', 'dorian'))
    // D dorian has only natural notes: on each string 25 frets contain 15 natural notes,
    // except when starting on a natural note at both ends (E, A, D, G all natural).
    const perString = (s: number) => notes.filter((n) => n.string === s).map((n) => n.fret)
    expect(perString(0)).toEqual([0, 1, 3, 5, 7, 8, 10, 12, 13, 15, 17, 19, 20, 22, 24])
    expect(notes.every((n) => !n.name.includes('#') && !n.name.includes('b'))).toBe(true)
  })

  it('marks roots and the lowest root as the starting note', () => {
    const notes = getFretboardNotes(fourString, 24, resolveScale('A', 'major'))
    const start = notes.filter((n) => n.isStart)
    expect(start).toHaveLength(1)
    // A on the E string fret 5 ties open A; the thicker string wins.
    expect(start[0]).toMatchObject({ string: 0, fret: 5, name: 'A', degree: 1 })
    expect(notes.filter((n) => n.isRoot).every((n) => n.name === 'A')).toBe(true)
  })

  it('respects the fret count', () => {
    const notes = getFretboardNotes(fourString, 20, resolveScale('C', 'major'))
    expect(Math.max(...notes.map((n) => n.fret))).toBe(20)
  })

  it('applies alternate tunings', () => {
    const dropD = getTuning('4-drop-d')!
    expect(openStringMidi(dropD)[0]).toBe(openStringMidi(fourString)[0] - 2)
    const notes = getFretboardNotes(dropD, 24, resolveScale('D', 'major'))
    expect(notes.find((n) => n.isStart)).toMatchObject({ string: 0, fret: 0 })
  })

  it('supports 5 and 6 string basses', () => {
    const five = getFretboardNotes(getTuning('5-standard')!, 24, resolveScale('E', 'minor'))
    expect(new Set(five.map((n) => n.string)).size).toBe(5)
    // Low B string, fret 5 is E.
    expect(five.find((n) => n.isStart)).toMatchObject({ string: 0, fret: 5 })
    const six = getFretboardNotes(getTuning('6-standard')!, 24, resolveScale('C', 'major'))
    expect(new Set(six.map((n) => n.string)).size).toBe(6)
  })
})

describe('buildPlaySequence', () => {
  const notes = getFretboardNotes(fourString, 24, resolveScale('A', 'major'))

  it('plays one octave in a single hand position', () => {
    const seq = buildPlaySequence(notes, 'up')
    expect(seq.map((n) => n.name)).toEqual(['A', 'B', 'C#', 'D', 'E', 'F#', 'G#', 'A'])
    expect(seq.map((n) => [n.string, n.fret])).toEqual([
      [0, 5],
      [0, 7],
      [1, 4],
      [1, 5],
      [1, 7],
      [2, 4],
      [2, 6],
      [2, 7],
    ])
  })

  it('reverses for descending', () => {
    expect(buildPlaySequence(notes, 'down').map((n) => n.name)).toEqual([
      'A',
      'G#',
      'F#',
      'E',
      'D',
      'C#',
      'B',
      'A',
    ])
  })

  it('goes up and back down, without repeating the root when looping', () => {
    expect(buildPlaySequence(notes, 'upDown')).toHaveLength(15)
    expect(buildPlaySequence(notes, 'upDown', true)).toHaveLength(14)
  })
})

describe('formatNote', () => {
  it('uses letters in English and solfège in Spanish', () => {
    expect(formatNote('Bb', 'en')).toBe('B♭')
    expect(formatNote('Bb', 'es')).toBe('Si♭')
    expect(formatNote('F#', 'es')).toBe('Fa♯')
    expect(formatNote('A', 'es')).toBe('La')
    expect(formatNote('G', 'es')).toBe('Sol')
  })

  it('formats interval accidentals', () => {
    expect(formatInterval('b3')).toBe('♭3')
  })
})
