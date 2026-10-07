import { create } from 'zustand'
import { defaultAccents, type Accent } from '../../rhythm/bar'
import { getMeter, isMeterId, subdivisionsFor, type MeterId, type Subdivision } from '../../rhythm/meters'
import { findPattern } from '../../rhythm/patterns'
import { BPM_MAX, BPM_MIN } from '../../rhythm/tapTempo'
import type { GapTrainer, SpeedTrainer } from '../../rhythm/trainer'
import { isKeyId, type KeyId } from '../../theory/scales'

export type MetronomeSettings = {
  meter: MeterId
  bpm: number
  sub: Subdivision
  /** 0–100 %. */
  swing: number
  accents: Accent[]
  /** Pattern id for the bass, or 'none' for clicks only. */
  pattern: string
  /** Pitch class the bass plays, in the low register (B0–A#1). */
  root: KeyId
  /** Volumes, 0–100. */
  click: number
  bass: number
  countIn: boolean
  speedOn: boolean
  speed: SpeedTrainer
  gapOn: boolean
  gap: GapTrainer
}

export const DEFAULT_METRONOME: MetronomeSettings = {
  meter: '4/4',
  bpm: 80,
  sub: 1,
  swing: 0,
  accents: defaultAccents(4),
  pattern: 'none',
  root: 'E',
  click: 80,
  bass: 70,
  countIn: false,
  speedOn: false,
  speed: { target: 120, step: 5, every: 4 },
  gapOn: false,
  gap: { play: 2, mute: 2 },
}

const intIn = (value: string | null, min: number, max: number): number | undefined => {
  const n = Number(value)
  return value !== null && Number.isInteger(n) && n >= min && n <= max ? n : undefined
}

/** Changing the meter resets everything that depends on its beats. */
export function withMeter(s: MetronomeSettings, meter: MeterId): MetronomeSettings {
  const m = getMeter(meter)
  return {
    ...s,
    meter,
    accents: defaultAccents(m.beats),
    sub: subdivisionsFor(m).includes(s.sub) ? s.sub : 1,
    pattern: findPattern(meter, s.pattern) ? s.pattern : 'none',
  }
}

export function metronomeFromParams(p: URLSearchParams): MetronomeSettings {
  const ts = p.get('ts') ?? ''
  let s = withMeter(DEFAULT_METRONOME, isMeterId(ts) ? ts : DEFAULT_METRONOME.meter)
  const meter = getMeter(s.meter)

  s.bpm = intIn(p.get('bpm'), BPM_MIN, BPM_MAX) ?? s.bpm
  const sub = Number(p.get('sub'))
  if ((subdivisionsFor(meter) as number[]).includes(sub)) s.sub = sub as Subdivision
  s.swing = intIn(p.get('swing'), 0, 100) ?? s.swing
  const acc = p.get('acc') ?? ''
  if (acc.length === meter.beats && /^[ANS]+$/.test(acc)) s.accents = [...acc] as Accent[]
  const pattern = p.get('pat') ?? ''
  if (findPattern(s.meter, pattern)) s.pattern = pattern
  const root = p.get('root') ?? ''
  if (isKeyId(root)) s.root = root
  s.click = intIn(p.get('click'), 0, 100) ?? s.click
  s.bass = intIn(p.get('bass'), 0, 100) ?? s.bass
  s.countIn = p.get('count') === '1'

  const sp = (p.get('sp') ?? '').split('-')
  const target = intIn(sp[0] ?? null, BPM_MIN, BPM_MAX)
  const step = intIn(sp[1] ?? null, 1, 50)
  const every = intIn(sp[2] ?? null, 1, 32)
  if (target && step && every) s = { ...s, speedOn: true, speed: { target, step, every } }

  const gap = (p.get('gap') ?? '').split('-')
  const play = intIn(gap[0] ?? null, 1, 16)
  const mute = intIn(gap[1] ?? null, 1, 16)
  if (play && mute) s = { ...s, gapOn: true, gap: { play, mute } }
  return s
}

export function metronomeToParams(s: MetronomeSettings): URLSearchParams {
  const d = DEFAULT_METRONOME
  const p = new URLSearchParams()
  p.set('ts', s.meter)
  p.set('bpm', String(s.bpm))
  if (s.sub !== d.sub) p.set('sub', String(s.sub))
  if (s.swing !== d.swing) p.set('swing', String(s.swing))
  const acc = s.accents.join('')
  if (acc !== defaultAccents(s.accents.length).join('')) p.set('acc', acc)
  if (s.pattern !== d.pattern) p.set('pat', s.pattern)
  if (s.root !== d.root) p.set('root', s.root)
  if (s.click !== d.click) p.set('click', String(s.click))
  if (s.bass !== d.bass) p.set('bass', String(s.bass))
  if (s.countIn) p.set('count', '1')
  if (s.speedOn) p.set('sp', `${s.speed.target}-${s.speed.step}-${s.speed.every}`)
  if (s.gapOn) p.set('gap', `${s.gap.play}-${s.gap.mute}`)
  return p
}

type MetronomeStore = MetronomeSettings & {
  isRunning: boolean
  set: (patch: Partial<MetronomeSettings>) => void
  setRunning: (isRunning: boolean) => void
}

export const useMetronomeStore = create<MetronomeStore>((set) => ({
  ...DEFAULT_METRONOME,
  isRunning: false,
  set: (patch) => set(patch),
  setRunning: (isRunning) => set({ isRunning }),
}))

export function pickMetronome(state: MetronomeStore): MetronomeSettings {
  const { isRunning: _running, set: _set, setRunning: _setRunning, ...settings } = state
  return settings
}
