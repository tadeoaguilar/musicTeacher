import { create } from 'zustand'
import {
  DEFAULT_NECK,
  DEFAULT_PLAYBACK,
  neckFromParams,
  neckToParams,
  type NeckSettings,
  type PlaybackSettings,
} from '../../app/neckSettings'
import { isChordId, type ChordId } from '../../theory/chords'
import { isKeyId, type KeyId } from '../../theory/scales'
import type { Octaves } from '../../theory/sequence'

/** Settings that describe what's on screen; these are stored in the URL so links are shareable. */
export type ArpeggioSettings = NeckSettings &
  PlaybackSettings & {
    key: KeyId
    chord: ChordId
    octaves: Octaves
  }

export const DEFAULT_ARPEGGIO: ArpeggioSettings = {
  key: 'C',
  chord: 'maj',
  octaves: 1,
  ...DEFAULT_NECK,
  ...DEFAULT_PLAYBACK,
}

/** Parses URL search params, ignoring anything invalid. */
export function arpeggioFromParams(params: URLSearchParams): ArpeggioSettings {
  const s: ArpeggioSettings = { ...DEFAULT_ARPEGGIO, ...neckFromParams(params) }
  const key = params.get('key')
  if (key && isKeyId(key)) s.key = key
  const chord = params.get('chord')
  if (chord && isChordId(chord)) s.chord = chord
  if (params.get('oct') === '2') s.octaves = 2
  return s
}

/** Serializes settings, leaving out defaults to keep URLs short. */
export function arpeggioToParams(s: ArpeggioSettings): URLSearchParams {
  const p = new URLSearchParams()
  p.set('key', s.key)
  p.set('chord', s.chord)
  if (s.octaves !== DEFAULT_ARPEGGIO.octaves) p.set('oct', String(s.octaves))
  return neckToParams(p, s)
}

type ArpeggioStore = ArpeggioSettings & {
  /** Index into the play sequence of the note currently sounding. */
  activeIndex: number | null
  isPlaying: boolean
  set: (patch: Partial<ArpeggioSettings>) => void
  setPlayback: (patch: { activeIndex?: number | null; isPlaying?: boolean }) => void
}

export const useArpeggioStore = create<ArpeggioStore>((set) => ({
  ...DEFAULT_ARPEGGIO,
  activeIndex: null,
  isPlaying: false,
  set: (patch) => set(patch),
  setPlayback: (patch) => set(patch),
}))

export function pickArpeggio(state: ArpeggioStore): ArpeggioSettings {
  const { key, chord, octaves, tuning, frets, labels, leftHanded, bpm, direction, loop } = state
  return { key, chord, octaves, tuning, frets, labels, leftHanded, bpm, direction, loop }
}
