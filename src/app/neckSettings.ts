import type { LabelMode } from '../components/Fretboard/Fretboard'
import { DIRECTIONS, type Direction } from '../theory/sequence'
import { FRET_COUNTS, getTuning, type FretCount } from '../theory/tunings'

/** How the neck is drawn; shared by every section that shows a fretboard. */
export type NeckSettings = {
  tuning: string
  frets: FretCount
  labels: LabelMode
  leftHanded: boolean
}

/** How a scale or arpeggio is played back. */
export type PlaybackSettings = {
  bpm: number
  direction: Direction
  loop: boolean
}

export const DEFAULT_NECK: NeckSettings = {
  tuning: '4-standard',
  frets: 24,
  labels: 'note',
  leftHanded: false,
}
export const DEFAULT_PLAYBACK: PlaybackSettings = { bpm: 90, direction: 'up', loop: false }

export const BPM_MIN = 40
export const BPM_MAX = 220

/** Reads neck and playback settings from URL params, ignoring anything invalid. */
export function neckFromParams(params: URLSearchParams): NeckSettings & PlaybackSettings {
  const s = { ...DEFAULT_NECK, ...DEFAULT_PLAYBACK }
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

/** Adds neck and playback settings to URL params, leaving out defaults to keep URLs short. */
export function neckToParams(p: URLSearchParams, s: NeckSettings & PlaybackSettings): URLSearchParams {
  if (s.tuning !== DEFAULT_NECK.tuning) p.set('tuning', s.tuning)
  if (s.frets !== DEFAULT_NECK.frets) p.set('frets', String(s.frets))
  if (s.labels !== DEFAULT_NECK.labels) p.set('labels', s.labels)
  if (s.leftHanded) p.set('lefty', '1')
  if (s.bpm !== DEFAULT_PLAYBACK.bpm) p.set('bpm', String(s.bpm))
  if (s.direction !== DEFAULT_PLAYBACK.direction) p.set('dir', s.direction)
  if (s.loop) p.set('loop', '1')
  return p
}
