import { canSwing, getMeter, type MeterId, type Subdivision } from './meters'
import { eventStarts, type Pattern } from './patterns'

/** A = accented click, N = normal click, S = silent beat. */
export type Accent = 'A' | 'N' | 'S'

const NEXT_ACCENT: Record<Accent, Accent> = { A: 'N', N: 'S', S: 'A' }

/** Tapping a beat light cycles accent → normal → silent. */
export function cycleAccent(accent: Accent): Accent {
  return NEXT_ACCENT[accent]
}

export function defaultAccents(beats: number): Accent[] {
  return Array.from({ length: beats }, (_, i) => (i === 0 ? 'A' : 'N'))
}

export type BarSettings = {
  meter: MeterId
  sub: Subdivision
  /** 0 = straight, 1 = full triplet swing. */
  swing: number
  accents: Accent[]
  /** Pattern the bass plays, if any. */
  pattern: Pattern | undefined
}

export type BarEvent =
  | { kind: 'accent' | 'normal' | 'sub'; at: number; beat: number }
  | { kind: 'bass'; at: number; beat: number; duration: number; index: number }

/**
 * Moves swung off-beats later. `unit` is the swung note length in beats (½ for
 * eighths, ¼ for sixteenths): at full swing the off-beat lands on the last
 * triplet of each pair, ⅔ of the way through.
 */
export function swingPosition(at: number, unit: number, amount: number): number {
  const pair = unit * 2
  const within = at % pair
  if (Math.abs(within - unit) > 1e-9) return at
  return at - within + unit + (amount * unit) / 3
}

/** Every sound in one bar, timed in beats from the downbeat (multiply by 60/BPM for seconds). */
export function buildBar({ meter: meterId, sub, swing, accents, pattern }: BarSettings): BarEvent[] {
  const meter = getMeter(meterId)
  const swingUnit = canSwing(meter, sub) && swing > 0 ? 1 / sub : undefined
  const place = (at: number) => (swingUnit ? swingPosition(at, swingUnit, swing) : at)
  const events: BarEvent[] = []

  for (let beat = 0; beat < meter.beats; beat++) {
    const accent = accents[beat] ?? 'N'
    if (accent === 'S') continue
    events.push({ kind: accent === 'A' ? 'accent' : 'normal', at: beat, beat })
    for (let k = 1; k < sub; k++) events.push({ kind: 'sub', at: place(beat + k / sub), beat })
  }

  if (pattern) {
    const starts = eventStarts(pattern.events)
    pattern.events.forEach((e, index) => {
      if (e.rest) return
      const at = place(starts[index] / meter.beatTicks)
      events.push({
        kind: 'bass',
        at,
        beat: Math.floor(at),
        duration: e.ticks / meter.beatTicks,
        index,
      })
    })
  }

  return events.sort((a, b) => a.at - b.at)
}
