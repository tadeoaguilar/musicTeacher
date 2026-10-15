import { create } from 'zustand'
import { DEFAULT_NECK, DEFAULT_PLAYBACK, neckFromParams, neckToParams } from '../../app/neckSettings'
import { LEVELS, type Level } from '../../ear/findNote'
import { PLAY_MODES, type PlayMode } from '../../ear/intervals'
import type { FretCount } from '../../theory/tunings'

export const EXERCISES = ['note', 'interval'] as const
export type Exercise = (typeof EXERCISES)[number]

/** Settings stored in the URL, so a teacher can share a drill as a link. */
export type EarSettings = {
  /** Which exercise tab is open. */
  exercise: Exercise
  level: Level
  tuning: string
  frets: FretCount
  leftHanded: boolean
  /** Show the note's name, or play it only (pure ear). */
  showName: boolean
  /** Intervals: notes going up, down, together, or a mix. */
  play: PlayMode
}

export const DEFAULT_EAR: EarSettings = {
  exercise: 'note',
  level: 1,
  tuning: DEFAULT_NECK.tuning,
  frets: DEFAULT_NECK.frets,
  leftHanded: DEFAULT_NECK.leftHanded,
  showName: true,
  play: 'up',
}

/** Parses URL search params, ignoring anything invalid. */
export function earFromParams(params: URLSearchParams): EarSettings {
  const { tuning, frets, leftHanded } = neckFromParams(params)
  const level = Number(params.get('level'))
  const exercise = params.get('ex')
  const play = params.get('play')
  return {
    exercise: (EXERCISES as readonly string[]).includes(exercise!)
      ? (exercise as Exercise)
      : DEFAULT_EAR.exercise,
    level: (LEVELS as number[]).includes(level) ? (level as Level) : DEFAULT_EAR.level,
    tuning,
    frets,
    leftHanded,
    showName: params.get('name') !== '0',
    play: (PLAY_MODES as readonly string[]).includes(play!) ? (play as PlayMode) : DEFAULT_EAR.play,
  }
}

/** Serializes settings, leaving out defaults to keep URLs short. */
export function earToParams(s: EarSettings): URLSearchParams {
  const p = new URLSearchParams()
  if (s.exercise !== DEFAULT_EAR.exercise) p.set('ex', s.exercise)
  if (s.level !== DEFAULT_EAR.level) p.set('level', String(s.level))
  if (!s.showName) p.set('name', '0')
  if (s.play !== DEFAULT_EAR.play) p.set('play', s.play)
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
  const { exercise, level, tuning, frets, leftHanded, showName, play } = state
  return { exercise, level, tuning, frets, leftHanded, showName, play }
}
