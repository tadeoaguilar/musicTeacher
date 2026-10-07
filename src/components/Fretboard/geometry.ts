const LABEL_COL = 30 // string names
const OPEN_COL = 50 // open-string (fret 0) notes, left of the nut
const AVG_FRET = 56
const PAD_RIGHT = 16
const TOP = 34
const STRING_GAP = 44
const BOTTOM = 30 // fret numbers

/**
 * Real frets shrink toward the body: x(n) = L·(1 − 2^(−n/12)). Blending that
 * with even spacing keeps the realistic look while high frets stay tappable.
 */
const REALISM = 0.5

export const INLAY_FRETS = [3, 5, 7, 9, 15, 17, 19, 21]
export const DOUBLE_INLAY_FRETS = [12, 24]

export type Layout = {
  width: number
  height: number
  neckTop: number
  neckBottom: number
  nutX: number
  /** Raw x of fret wire n (n = 0 is the nut), before mirroring. */
  fretWireX: (n: number) => number
  /** Center x where a note on fret n is drawn, before mirroring. */
  noteX: (fret: number) => number
  stringLabelX: number
  stringY: (string: number) => number
  /** Applies left-handed mirroring to any x. */
  x: (rawX: number) => number
}

export function createLayout(stringCount: number, fretCount: number, leftHanded: boolean): Layout {
  const nutX = LABEL_COL + OPEN_COL
  const neckLen = fretCount * AVG_FRET
  const width = nutX + neckLen + PAD_RIGHT
  const realEnd = 1 - 2 ** (-fretCount / 12)

  const fretWireX = (n: number) =>
    nutX + neckLen * ((1 - REALISM) * (n / fretCount) + (REALISM * (1 - 2 ** (-n / 12))) / realEnd)

  const neckTop = TOP - STRING_GAP / 2
  const neckBottom = TOP + (stringCount - 1) * STRING_GAP + STRING_GAP / 2

  return {
    width,
    height: neckBottom + BOTTOM,
    neckTop,
    neckBottom,
    nutX,
    fretWireX,
    noteX: (fret) =>
      fret === 0 ? LABEL_COL + OPEN_COL / 2 - 2 : (fretWireX(fret - 1) + fretWireX(fret)) / 2,
    stringLabelX: LABEL_COL / 2,
    // Lowest string at the bottom, as the player sees it looking down at the bass.
    stringY: (string) => TOP + (stringCount - 1 - string) * STRING_GAP,
    x: (rawX) => (leftHanded ? width - rawX : rawX),
  }
}
