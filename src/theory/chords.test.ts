import { describe, expect, it } from 'vitest'
import { CHORD_IDS, getChord, isChordId, type ChordId } from './chords'
import { getFretboardNotes } from './fretboard'
import { resolveNoteSet, type KeyId } from './scales'
import { buildPlaySequence } from './sequence'
import { getTuning } from './tunings'

const chord = (key: KeyId, id: ChordId) => resolveNoteSet(key, getChord(id))

describe('chord spelling', () => {
  it.each<[KeyId, ChordId, string[]]>([
    ['C', 'maj', ['C', 'E', 'G']],
    ['A', 'min', ['A', 'C', 'E']],
    ['B', 'dim', ['B', 'D', 'F']],
    ['C', 'aug', ['C', 'E', 'G#']],
    ['D', 'sus4', ['D', 'G', 'A']],
    ['F', 'maj7', ['F', 'A', 'C', 'E']],
    ['G', 'dom7', ['G', 'B', 'D', 'F']],
    ['D', 'm7', ['D', 'F', 'A', 'C']],
    ['B', 'm7b5', ['B', 'D', 'F', 'A']],
    ['C', 'dim7', ['C', 'Eb', 'Gb', 'Bbb']],
    ['C', 'maj6', ['C', 'E', 'G', 'A']],
    ['A', 'm6', ['A', 'C', 'E', 'F#']],
  ])('%s %s is %j', (key, id, notes) => {
    expect(chord(key, id).notes).toEqual(notes)
  })

  it('spells sharp keys with sharps', () => {
    expect(chord('F#', 'dom7').notes).toEqual(['F#', 'A#', 'C#', 'E'])
    expect(chord('E', 'maj7').notes).toEqual(['E', 'G#', 'B', 'D#'])
  })

  it('spells flat keys with flats', () => {
    expect(chord('Eb', 'maj7').notes).toEqual(['Eb', 'G', 'Bb', 'D'])
    expect(chord('Ab', 'dom7').notes).toEqual(['Ab', 'C', 'Eb', 'Gb'])
  })

  it('avoids awkward spellings like Fb when the enharmonic root reads easier', () => {
    // Bbm7b5 would need Fb; A#m7b5 is A# C# E G#.
    expect(chord('Bb', 'm7b5').notes).toEqual(['A#', 'C#', 'E', 'G#'])
  })

  it('picks the enharmonic root with fewer accidentals', () => {
    expect(chord('C#', 'maj').tonic).toBe('Db')
    expect(chord('C#', 'min').tonic).toBe('C#')
  })

  it('labels chord tones by degree', () => {
    expect(chord('G', 'dom7').intervals).toEqual(['R', '3', '5', 'b7'])
    expect(chord('C', 'dim7').intervals).toEqual(['R', 'b3', 'b5', 'bb7'])
    expect(chord('C', 'aug').intervals).toEqual(['R', '3', '#5'])
    expect(chord('D', 'sus4').intervals).toEqual(['R', '4', '5'])
    expect(chord('C', 'maj6').intervals).toEqual(['R', '3', '5', '6'])
  })

  it('validates chord ids', () => {
    expect(CHORD_IDS).toHaveLength(12)
    expect(isChordId('m7b5')).toBe(true)
    expect(isChordId('add9')).toBe(false)
  })
})

describe('arpeggios on the neck', () => {
  const fourString = getTuning('4-standard')!

  it('marks only chord tones', () => {
    const notes = getFretboardNotes(fourString, 24, chord('G', 'dom7'))
    expect(new Set(notes.map((n) => n.name))).toEqual(new Set(['G', 'B', 'D', 'F']))
    // Lowest G: E string, fret 3.
    expect(notes.find((n) => n.isStart)).toMatchObject({ string: 0, fret: 3 })
  })

  it('plays two octaves in one position', () => {
    const notes = getFretboardNotes(fourString, 24, chord('G', 'dom7'))
    const seq = buildPlaySequence(notes, 'up', false, 2)
    expect(seq.map((n) => n.name)).toEqual(['G', 'B', 'D', 'F', 'G', 'B', 'D', 'F', 'G'])
    expect(seq.at(-1)!.midi - seq[0].midi).toBe(24)
    // Ascending pitch, every note once.
    seq.slice(1).forEach((n, i) => expect(n.midi).toBeGreaterThan(seq[i].midi))
  })

  it('plays one octave by default', () => {
    const notes = getFretboardNotes(fourString, 24, chord('C', 'maj7'))
    expect(buildPlaySequence(notes, 'up').map((n) => n.name)).toEqual(['C', 'E', 'G', 'B', 'C'])
  })
})
