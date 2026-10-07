import { noteChroma, noteMidi } from './notes'
import { resolveScale, type KeyId, type ScaleId } from './scales'
import type { Tuning } from './tunings'

export type FretNote = {
  /** String index, 0 = lowest string. */
  string: number
  fret: number
  midi: number
  /** Key-correct spelling, e.g. "Bb". */
  name: string
  /** Interval label from the tonic, e.g. "b3". */
  interval: string
  /** Scale degree, 1-7. */
  degree: number
  isRoot: boolean
  /** The lowest root on the neck: where to start playing the scale. */
  isStart: boolean
}

/** Identifies a spot on the neck, e.g. "0-5" for string 0, fret 5. */
export const positionKey = (n: { string: number; fret: number }) => `${n.string}-${n.fret}`

export function openStringMidi(tuning: Tuning): number[] {
  return tuning.strings.map(noteMidi)
}

/** Every scale note on the neck, ordered by string then fret. */
export function getFretboardNotes(
  tuning: Tuning,
  fretCount: number,
  key: KeyId,
  scaleId: ScaleId,
): FretNote[] {
  const scale = resolveScale(key, scaleId)
  const tonicChroma = noteChroma(scale.tonic)
  const degreeBySemitone = new Map(scale.semitones.map((st, i) => [st, i]))

  const notes: FretNote[] = []
  openStringMidi(tuning).forEach((openMidi, string) => {
    for (let fret = 0; fret <= fretCount; fret++) {
      const midi = openMidi + fret
      const i = degreeBySemitone.get((((midi - tonicChroma) % 12) + 12) % 12)
      if (i === undefined) continue
      notes.push({
        string,
        fret,
        midi,
        name: scale.notes[i],
        interval: scale.intervals[i],
        degree: i + 1,
        isRoot: i === 0,
        isStart: false,
      })
    }
  })

  // Lowest root by pitch; on a tie prefer the thicker string (e.g. A on E string fret 5).
  const start = notes
    .filter((n) => n.isRoot)
    .reduce<FretNote | undefined>(
      (best, n) =>
        !best || n.midi < best.midi || (n.midi === best.midi && n.string < best.string) ? n : best,
      undefined,
    )
  if (start) start.isStart = true
  return notes
}
