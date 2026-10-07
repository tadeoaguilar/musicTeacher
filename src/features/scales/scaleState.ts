import { create } from 'zustand'
import type { LabelMode } from '../../components/Fretboard/Fretboard'
import { isKeyId, isScaleId, type KeyId, type ScaleId } from '../../theory/scales'
import { DIRECTIONS, type Direction } from '../../theory/sequence'
import { FRET_COUNTS, getTuning, type FretCount } from '../../theory/tunings'

/** Settings that describe what's on screen; these are stored in the URL so links are shareable. */
export type ScaleSettings = {
  key: KeyId
  scale: ScaleId
  tuning: string
  frets: FretCount
  labels: LabelMode
  leftHanded: boolean
  bpm: number
  direction: Direction
  loop: boolean
}

export const DEFAULT_SETTINGS: ScaleSettings = {
  key: 'C',
  scale: 'major',
  tuning: '4-standard',
  frets: 24,
  labels: 'note',
  leftHanded: false,
  bpm: 90,
  direction: 'up',
  loop: false,
}

export const BPM_MIN = 40
export const BPM_MAX = 220

/** Parses URL search params, ignoring anything invalid. */
export function settingsFromParams(params: URLSearchParams): ScaleSettings {
  const s = { ...DEFAULT_SETTINGS }
  const key = params.get('key')
  if (key && isKeyId(key)) s.key = key
  const scale = params.get('scale')
  if (scale && isScaleId(scale)) s.scale = scale
  const tuning = params.get('tuning')
  if (tuning && getTuning(tuning)) s.tuning = tuning
  const frets = Number(params.get('frets'))
  if ((FRET_COUNTS as readonly number[]).includes(frets)) s.frets = frets as FretCount
  const labels = params.get('labels')
  if (labels === 'note' || labels === 'interval') s.labels = labels
  if (params.get('lefty') === '1') s.leftHanded = true
  const bpm = Number(params.get('bpm'))
  if (Number.isInteger(bpm) && bpm >= BPM_MIN && bpm <= BPM_MAX) s.bpm = bpm
  const direction = params.get('dir')
  if (direction && (DIRECTIONS as string[]).includes(direction)) s.direction = direction as Direction
  if (params.get('loop') === '1') s.loop = true
  return s
}

/** Serializes settings, leaving out defaults to keep URLs short. */
export function settingsToParams(s: ScaleSettings): URLSearchParams {
  const p = new URLSearchParams()
  p.set('key', s.key)
  p.set('scale', s.scale)
  if (s.tuning !== DEFAULT_SETTINGS.tuning) p.set('tuning', s.tuning)
  if (s.frets !== DEFAULT_SETTINGS.frets) p.set('frets', String(s.frets))
  if (s.labels !== DEFAULT_SETTINGS.labels) p.set('labels', s.labels)
  if (s.leftHanded) p.set('lefty', '1')
  if (s.bpm !== DEFAULT_SETTINGS.bpm) p.set('bpm', String(s.bpm))
  if (s.direction !== DEFAULT_SETTINGS.direction) p.set('dir', s.direction)
  if (s.loop) p.set('loop', '1')
  return p
}

type ScaleStore = ScaleSettings & {
  /** Index into the play sequence of the note currently sounding. */
  activeIndex: number | null
  isPlaying: boolean
  set: (patch: Partial<ScaleSettings>) => void
  setPlayback: (patch: { activeIndex?: number | null; isPlaying?: boolean }) => void
}

export const useScaleStore = create<ScaleStore>((set) => ({
  ...DEFAULT_SETTINGS,
  activeIndex: null,
  isPlaying: false,
  set: (patch) => set(patch),
  setPlayback: (patch) => set(patch),
}))

export function pickSettings(state: ScaleStore): ScaleSettings {
  const { key, scale, tuning, frets, labels, leftHanded, bpm, direction, loop } = state
  return { key, scale, tuning, frets, labels, leftHanded, bpm, direction, loop }
}
