import { create } from 'zustand'
import type { MicErrorReason } from '../../audio/MicInput'
import { getTuning } from '../../theory/tunings'

/** Settings stored in the URL so links are shareable. */
export type TunerSettings = {
  tuning: string
  /** Reference pitch in Hz. */
  a4: number
}

export const DEFAULT_TUNER: TunerSettings = { tuning: '4-standard', a4: 440 }

export const A4_MIN = 432
export const A4_MAX = 446

/** Parses URL search params, ignoring anything invalid. */
export function tunerFromParams(params: URLSearchParams): TunerSettings {
  const s = { ...DEFAULT_TUNER }
  const tuning = params.get('tuning')
  if (tuning && getTuning(tuning)) s.tuning = tuning
  const a4 = Number(params.get('a4'))
  if (Number.isInteger(a4) && a4 >= A4_MIN && a4 <= A4_MAX) s.a4 = a4
  return s
}

/** Serializes settings, leaving out defaults to keep URLs short. */
export function tunerToParams(s: TunerSettings): URLSearchParams {
  const p = new URLSearchParams()
  if (s.tuning !== DEFAULT_TUNER.tuning) p.set('tuning', s.tuning)
  if (s.a4 !== DEFAULT_TUNER.a4) p.set('a4', String(s.a4))
  return p
}

/** What the microphone is doing; not part of the URL. */
type LiveState = {
  listening: boolean
  /** Smoothed detected pitch in Hz, or null when no note is ringing. */
  hz: number | null
  /** Microphone RMS level, 0–1. */
  level: number
  error: MicErrorReason | undefined
}

type TunerStore = TunerSettings &
  LiveState & {
    set: (patch: Partial<TunerSettings>) => void
    setLive: (patch: Partial<LiveState>) => void
  }

export const useTunerStore = create<TunerStore>((set) => ({
  ...DEFAULT_TUNER,
  listening: false,
  hz: null,
  level: 0,
  error: undefined,
  set: (patch) => set(patch),
  setLive: (patch) => set(patch),
}))

export function pickTuner(state: TunerStore): TunerSettings {
  const { tuning, a4 } = state
  return { tuning, a4 }
}
