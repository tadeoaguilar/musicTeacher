import { create } from 'zustand'
import {
  DEFAULT_NECK,
  DEFAULT_PLAYBACK,
  neckFromParams,
  neckToParams,
  type NeckSettings,
  type PlaybackSettings,
} from '../../app/neckSettings'
import { isKeyId, isScaleId, type KeyId, type ScaleId } from '../../theory/scales'

/** Settings that describe what's on screen; these are stored in the URL so links are shareable. */
export type ScaleSettings = NeckSettings &
  PlaybackSettings & {
    key: KeyId
    scale: ScaleId
  }

export const DEFAULT_SETTINGS: ScaleSettings = {
  key: 'C',
  scale: 'major',
  ...DEFAULT_NECK,
  ...DEFAULT_PLAYBACK,
}

/** Parses URL search params, ignoring anything invalid. */
export function settingsFromParams(params: URLSearchParams): ScaleSettings {
  const s: ScaleSettings = { ...DEFAULT_SETTINGS, ...neckFromParams(params) }
  const key = params.get('key')
  if (key && isKeyId(key)) s.key = key
  const scale = params.get('scale')
  if (scale && isScaleId(scale)) s.scale = scale
  return s
}

/** Serializes settings, leaving out defaults to keep URLs short. */
export function settingsToParams(s: ScaleSettings): URLSearchParams {
  const p = new URLSearchParams()
  p.set('key', s.key)
  p.set('scale', s.scale)
  return neckToParams(p, s)
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
