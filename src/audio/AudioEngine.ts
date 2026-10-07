export type SequenceOptions = {
  bpm: number
  loop: boolean
  /** Called in sync with the sound: the index of the note now playing, or null when finished. */
  onNote: (index: number | null) => void
}

export type NoteOptions = {
  /** Reference pitch in Hz; 440 if not given. */
  a4?: number
  /** Seconds; a short pluck if not given. */
  duration?: number
}

/**
 * Everything the UI needs from audio. The synth implementation can be swapped
 * for a sampled bass later without touching components.
 */
export interface AudioEngine {
  playNote(midi: number, options?: NoteOptions): Promise<void>
  playSequence(midis: number[], options: SequenceOptions): Promise<void>
  setBpm(bpm: number): void
  stop(): void
}
