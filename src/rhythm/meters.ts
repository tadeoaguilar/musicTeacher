/** Rhythm positions are measured in ticks: 48 per quarter note, so triplets and sixteenths are whole numbers. */
export const TICKS_PER_QUARTER = 48

export const METER_IDS = ['2/4', '3/4', '4/4', '6/8', '9/8', '12/8'] as const
export type MeterId = (typeof METER_IDS)[number]

export function isMeterId(value: string): value is MeterId {
  return (METER_IDS as readonly string[]).includes(value)
}

export type Meter = {
  id: MeterId
  /** Pulses per bar: quarters in simple meters, dotted quarters in compound ones (6/8 → 2). */
  beats: number
  compound: boolean
  beatTicks: number
  barTicks: number
}

export function getMeter(id: MeterId): Meter {
  const [top] = id.split('/').map(Number)
  const compound = id.endsWith('/8')
  const beats = compound ? top / 3 : top
  const beatTicks = compound ? TICKS_PER_QUARTER * 1.5 : TICKS_PER_QUARTER
  return { id, beats, compound, beatTicks, barTicks: beats * beatTicks }
}

/** Clicks per beat. Simple meters: quarter, eighths, triplets, sixteenths, sixteenth triplets. */
export type Subdivision = 1 | 2 | 3 | 4 | 6

export function subdivisionsFor(meter: Meter): Subdivision[] {
  // Compound beats split naturally into three eighths (or six sixteenths).
  return meter.compound ? [1, 3, 6] : [1, 2, 3, 4, 6]
}

/** Swing only makes sense for straight eighths or sixteenths. */
export function canSwing(meter: Meter, sub: Subdivision): boolean {
  return !meter.compound && (sub === 2 || sub === 4)
}
