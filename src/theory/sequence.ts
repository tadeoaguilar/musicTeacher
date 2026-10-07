import type { FretNote } from './fretboard'

export type Direction = 'up' | 'down' | 'upDown'

export const DIRECTIONS: Direction[] = ['up', 'down', 'upDown']

export type Octaves = 1 | 2

export const OCTAVES: Octaves[] = [1, 2]

/**
 * One or two octaves of the scale or chord from the starting root, played in a
 * single hand position: each pitch uses the fret closest to the starting fret,
 * preferring moving across strings over sliding up one string.
 */
export function buildPlaySequence(
  fretNotes: FretNote[],
  direction: Direction,
  loop = false,
  octaves: Octaves = 1,
): FretNote[] {
  const start = fretNotes.find((n) => n.isStart)
  if (!start) return []

  const pitches = [...new Set(fretNotes.map((n) => n.midi))]
    .filter((m) => m >= start.midi && m <= start.midi + 12 * octaves)
    .sort((a, b) => a - b)

  const up = pitches.map((midi) => {
    if (midi === start.midi) return start
    return fretNotes
      .filter((n) => n.midi === midi)
      .reduce((best, n) => {
        const d = Math.abs(n.fret - start.fret)
        const bestD = Math.abs(best.fret - start.fret)
        return d < bestD || (d === bestD && n.string > best.string) ? n : best
      })
  })

  switch (direction) {
    case 'up':
      return up
    case 'down':
      return [...up].reverse()
    case 'upDown': {
      const down = up.slice(0, -1).reverse()
      // When looping, the next pass starts on the root, so don't play it twice.
      return [...up, ...(loop ? down.slice(0, -1) : down)]
    }
  }
}
