import { getMeter, type MeterId } from './meters'
import { eventStarts, type Pattern } from './patterns'

export type NoteValue = 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth'

const VALUES: Record<number, { value: NoteValue; dotted?: boolean; triplet?: boolean }> = {
  192: { value: 'whole' },
  144: { value: 'half', dotted: true },
  96: { value: 'half' },
  72: { value: 'quarter', dotted: true },
  48: { value: 'quarter' },
  36: { value: 'eighth', dotted: true },
  24: { value: 'eighth' },
  18: { value: 'sixteenth', dotted: true },
  12: { value: 'sixteenth' },
  16: { value: 'eighth', triplet: true },
  8: { value: 'sixteenth', triplet: true },
}

export type Glyph = {
  index: number
  start: number
  ticks: number
  rest: boolean
  value: NoteValue
  dotted: boolean
  triplet: boolean
  /** Eighths/sixteenths not joined by a beam get flags. */
  flagged: boolean
}

export type Beam = {
  notes: number[]
  /** Pairs of glyph indices joined by a second (sixteenth) beam. */
  secondary: [number, number][]
  /** Lone sixteenths inside an eighth beam get a short stub pointing left (-1) or right (1). */
  stubs: { index: number; dir: -1 | 1 }[]
}

export type Tuplet = { first: number; last: number; count: number }

export type RhythmLayout = {
  glyphs: Glyph[]
  beams: Beam[]
  tuplets: Tuplet[]
  barTicks: number
  beatTicks: number
}

const isShort = (g: Glyph) => !g.rest && (g.value === 'eighth' || g.value === 'sixteenth')

/** Problems that would make a pattern unreadable; empty when the pattern is fine. */
export function validatePattern(pattern: Pattern, meterId: MeterId): string[] {
  const { barTicks, beatTicks } = getMeter(meterId)
  const errors: string[] = []
  const total = pattern.events.reduce((sum, e) => sum + e.ticks, 0)
  if (total !== barTicks) errors.push(`${pattern.id}: fills ${total} of ${barTicks} ticks`)
  const starts = eventStarts(pattern.events)
  pattern.events.forEach((e, i) => {
    if (!VALUES[e.ticks]) errors.push(`${pattern.id}[${i}]: no note value for ${e.ticks} ticks`)
    const onBeat = starts[i] % beatTicks === 0
    const sameBeat = Math.floor(starts[i] / beatTicks) === Math.floor((starts[i] + e.ticks - 1) / beatTicks)
    if (!onBeat && !sameBeat) errors.push(`${pattern.id}[${i}]: crosses a beat without starting on one`)
  })
  return errors
}

/** Turns a one-bar pattern into notation: note values, beams within each beat, flags and tuplet brackets. */
export function layoutRhythm(pattern: Pattern, meterId: MeterId): RhythmLayout {
  const { barTicks, beatTicks } = getMeter(meterId)
  const starts = eventStarts(pattern.events)
  const beatOf = (g: Glyph) => Math.floor(g.start / beatTicks)

  const glyphs: Glyph[] = pattern.events.map((e, index) => {
    const v = VALUES[e.ticks]
    if (!v) throw new Error(`No note value for ${e.ticks} ticks`)
    return {
      index,
      start: starts[index],
      ticks: e.ticks,
      rest: !!e.rest,
      value: v.value,
      dotted: !!v.dotted,
      triplet: !!v.triplet,
      flagged: false,
    }
  })

  // Beam consecutive eighths/sixteenths that share a beat; rests break the beam.
  const beams: Beam[] = []
  let run: Glyph[] = []
  const flush = () => {
    if (run.length === 1) run[0].flagged = true
    if (run.length > 1) {
      const secondary: [number, number][] = []
      const stubs: Beam['stubs'] = []
      run.forEach((g, i) => {
        if (g.value !== 'sixteenth') return
        const prev = run[i - 1]
        const next = run[i + 1]
        if (next?.value === 'sixteenth') secondary.push([g.index, next.index])
        if (prev?.value !== 'sixteenth' && next?.value !== 'sixteenth') {
          stubs.push({ index: g.index, dir: next ? 1 : -1 })
        }
      })
      beams.push({ notes: run.map((g) => g.index), secondary, stubs })
    }
    run = []
  }
  for (const g of glyphs) {
    if (!isShort(g) || (run.length && beatOf(run[0]) !== beatOf(g))) flush()
    if (isShort(g)) run.push(g)
  }
  flush()

  // One bracket per beat of triplets.
  const tuplets: Tuplet[] = []
  for (const g of glyphs) {
    if (!g.triplet) continue
    const last = tuplets.at(-1)
    if (last && last.last === g.index - 1 && beatOf(glyphs[last.first]) === beatOf(g)) {
      last.last = g.index
      last.count++
    } else {
      tuplets.push({ first: g.index, last: g.index, count: 1 })
    }
  }

  return { glyphs, beams, tuplets, barTicks, beatTicks }
}
