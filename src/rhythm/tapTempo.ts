export const BPM_MIN = 30
export const BPM_MAX = 300

/** A pause longer than this starts a new tap sequence. */
const RESET_MS = 2000
const MAX_TAPS = 5

/**
 * Adds a tap (in ms) and returns the taps to keep plus the tempo they imply:
 * the average of the last four intervals, rounded and clamped.
 */
export function tapTempo(previous: number[], now: number): { taps: number[]; bpm: number | undefined } {
  const last = previous.at(-1)
  const taps = (last !== undefined && now - last <= RESET_MS ? [...previous, now] : [now]).slice(-MAX_TAPS)
  if (taps.length < 2) return { taps, bpm: undefined }
  const average = (taps.at(-1)! - taps[0]) / (taps.length - 1)
  const bpm = Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(60000 / average)))
  return { taps, bpm }
}
