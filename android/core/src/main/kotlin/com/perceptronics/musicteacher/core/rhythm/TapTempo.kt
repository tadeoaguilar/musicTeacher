package com.perceptronics.musicteacher.core.rhythm

// Port of src/rhythm/tapTempo.ts.

const val BPM_MIN = 30
const val BPM_MAX = 300

/** A pause longer than this starts a new tap sequence. */
private const val RESET_MS = 2000
private const val MAX_TAPS = 5

data class TapResult(val taps: List<Long>, val bpm: Int?)

/**
 * Adds a tap (in ms) and returns the taps to keep plus the tempo they imply:
 * the average of the last four intervals, rounded and clamped.
 */
fun tapTempo(previous: List<Long>, now: Long): TapResult {
    val last = previous.lastOrNull()
    val taps = (if (last != null && now - last <= RESET_MS) previous + now else listOf(now)).takeLast(MAX_TAPS)
    if (taps.size < 2) return TapResult(taps, null)
    val average = (taps.last() - taps.first()).toDouble() / (taps.size - 1)
    // Math.round, like JavaScript's: halves round up (kotlin.math.round would round them to even).
    val bpm = Math.round(60000 / average).toInt().coerceIn(BPM_MIN, BPM_MAX)
    return TapResult(taps, bpm)
}
