import { create } from 'zustand'
import { DEFAULT_NECK, DEFAULT_PLAYBACK, neckFromParams, neckToParams } from '../../app/neckSettings'
import { LEVELS, type Level } from '../../ear/findNote'
import type { FretCount } from '../../theory/tunings'

/** Settings stored in the URL, so a teacher can share a drill as a link. */
export type EarSettings = {
  level: Level
  tuning: string
  frets: FretCount
  leftHanded: boolean
  /** Show the note's name, or play it only (pure ear). */
  showName: boolean
}

export const DEFAULT_EAR: EarSettings = {
  level: 1,
  tuning: DEFAULT_NECK.tuning,
  frets: DEFAULT_NECK.frets,
  leftHanded: DEFAULT_NECK.leftHanded,
  showName: true,
}

/** Parses URL search params, ignoring anything invalid. */
export function earFromParams(params: URLSearchParams): EarSettings {
  const { tuning, frets, leftHanded } = neckFromParams(params)
  const level = Number(params.get('level'))
  return {
    level: (LEVELS as number[]).includes(level) ? (level as Level) : DEFAULT_EAR.level,
    tuning,
    frets,
    leftHanded,
    showName: params.get('name') !== '0',
  }
}

/** Serializes settings, leaving out defaults to keep URLs short. */
export function earToParams(s: EarSettings): URLSearchParams {
  const p = new URLSearchParams()
  if (s.level !== DEFAULT_EAR.level) p.set('level', String(s.level))
  if (!s.showName) p.set('name', '0')
  return neckToParams(p, {
    ...DEFAULT_NECK,
    ...DEFAULT_PLAYBACK,
    tuning: s.tuning,
    frets: s.frets,
    leftHanded: s.leftHanded,
  })
}

type EarStore = EarSettings & { set: (patch: Partial<EarSettings>) => void }

export const useEarStore = create<EarStore>((set) => ({ ...DEFAULT_EAR, set: (patch) => set(patch) }))

export function pickEar(state: EarStore): EarSettings {
  const { level, tuning, frets, leftHanded, showName } = state
  return { level, tuning, frets, leftHanded, showName }
}
