import { frequencyToMidi, noteMidi } from '../theory/notes'
import { KEY_IDS } from '../theory/scales'
import type { Tuning } from '../theory/tunings'

/** The lowest and highest pitches the tuner listens for: A0 (5-string drop A) up past C4. */
export const MIN_HZ = 27
export const MAX_HZ = 500

/** Within this many cents a note counts as in tune. */
export const IN_TUNE_CENTS = 5

export type NoteReading = {
  /** Nearest note, e.g. 33 for A1. */
  midi: number
  /** −50 to +50: how far the pitch is from that note; negative is flat. */
  cents: number
  /** Spelled with an octave, e.g. "Bb0". */
  name: string
}

export function readNote(hz: number, a4 = 440): NoteReading {
  const exact = frequencyToMidi(hz, a4)
  const midi = Math.round(exact)
  return {
    midi,
    cents: (exact - midi) * 100,
    name: `${KEY_IDS[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`,
  }
}

/** Index of the open string tuned to this note (lowest string = 0), if any. */
export function matchString(midi: number, tuning: Tuning): number | undefined {
  const index = tuning.strings.findIndex((s) => noteMidi(s) === midi)
  return index === -1 ? undefined : index
}

const HISTORY = 5
/** A plucked note fades in and out of detection; hold it through this many missed readings. */
const HOLD = 6

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

/**
 * Steadies raw detections: the median of the last few readings ignores the odd
 * wrong-octave frame, and the note is held briefly through dropouts so the
 * needle doesn't flicker.
 */
export function createSmoother() {
  let history: number[] = []
  let missed = 0
  return {
    push(hz: number | null): number | null {
      if (hz === null) {
        if (++missed > HOLD) history = []
        return history.length ? median(history) : null
      }
      missed = 0
      history = [...history.slice(-(HISTORY - 1)), hz]
      return median(history)
    },
    reset() {
      history = []
      missed = 0
    },
  }
}
