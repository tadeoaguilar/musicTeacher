package com.perceptronics.musicteacher.core.ear

import com.perceptronics.musicteacher.core.theory.FretPosition
import com.perceptronics.musicteacher.core.theory.Position
import com.perceptronics.musicteacher.core.theory.Tuning
import com.perceptronics.musicteacher.core.theory.openStringMidi
import kotlin.math.abs
import kotlin.math.floor
import kotlin.math.min

// Port of src/ear/intervals.ts.

/** Intervals up to an octave, by size. `TT` is the tritone. */
val INTERVAL_IDS = listOf("m2", "M2", "m3", "M3", "P4", "TT", "P5", "m6", "M6", "m7", "M7", "P8")

fun isIntervalId(value: String) = value in INTERVAL_IDS

fun semitonesOf(id: String): Int = INTERVAL_IDS.indexOf(id) + 1

/** How a bassist labels the upper note of the shape: "5", "♭3", "♭5" for the tritone. */
val DEGREE_LABELS = mapOf(
    "m2" to "b2",
    "M2" to "2",
    "m3" to "b3",
    "M3" to "3",
    "P4" to "4",
    "TT" to "b5",
    "P5" to "5",
    "m6" to "b6",
    "M6" to "6",
    "m7" to "b7",
    "M7" to "7",
    "P8" to "8",
)

/** Level 1: the open, stable sounds; level 2 adds thirds and sixths; level 3 is everything. */
fun intervalsFor(level: Int): List<String> = when (level) {
    1 -> listOf("P4", "P5", "P8")
    2 -> listOf("m3", "M3", "P4", "P5", "m6", "M6", "P8")
    else -> INTERVAL_IDS
}

/** How the two notes are played. */
enum class IntervalDirection(val id: String) { UP("up"), DOWN("down"), TOGETHER("together") }

/** A setting: one direction, or MIXED to pick one at random each time. */
enum class PlayMode(val id: String, val direction: IntervalDirection?) {
    UP("up", IntervalDirection.UP),
    DOWN("down", IntervalDirection.DOWN),
    TOGETHER("together", IntervalDirection.TOGETHER),
    MIXED("mixed", null),
}

data class IntervalOptions(val tuning: Tuning, val frets: Int, val level: Int, val play: PlayMode)

data class IntervalQuestion(
    val interval: String,
    /** The lower of the two notes (MIDI). */
    val low: Int,
    val direction: IntervalDirection,
)

/**
 * Notes stay within the first 12 frets: that's where the shapes are learned, and
 * it keeps the sound in the bass's natural register.
 */
const val INTERVAL_MAX_FRET = 12

fun highOf(q: IntervalQuestion) = q.low + semitonesOf(q.interval)

/** The note played first (the reference): the higher one when descending. */
fun firstOf(q: IntervalQuestion) = if (q.direction == IntervalDirection.DOWN) highOf(q) else q.low

data class Shape(val low: FretPosition, val high: FretPosition)

/**
 * Where to play an interval as one hand shape: the upper note on the same or a
 * higher string, with the smallest stretch, as low on the neck as possible.
 * A fifth comes out as "one string up, two frets over".
 */
fun shapeOf(low: Int, high: Int, tuning: Tuning, maxFret: Int): Shape? {
    val opens = openStringMidi(tuning)
    var best: Pair<Shape, Double>? = null
    opens.forEachIndexed { ls, lowOpen ->
        val lf = low - lowOpen
        if (lf < 0 || lf > maxFret) return@forEachIndexed
        for (hs in ls until opens.size) {
            val hf = high - opens[hs]
            if (hf < 0 || hf > maxFret) continue
            val cost = abs(hf - lf) * 10 + (hs - ls) + min(lf, hf) * 0.1
            if (best == null || cost < best!!.second) best = Shape(FretPosition(ls, lf), FretPosition(hs, hf)) to cost
        }
    }
    return best?.first
}

/** Lower notes the interval can start from, so that the whole shape fits on the neck. */
fun lowNotesFor(interval: String, tuning: Tuning, frets: Int): List<Int> {
    val maxFret = min(frets, INTERVAL_MAX_FRET)
    val opens = openStringMidi(tuning)
    return (opens.min()..opens.max() + maxFret).filter {
        shapeOf(it, it + semitonesOf(interval), tuning, maxFret) !=
            null
    }
}

/**
 * A new question. Intervals you miss come up more often; the starting note is
 * random, and never the very same question twice in a row.
 */
fun nextIntervalQuestion(
    options: IntervalOptions,
    random: Random,
    stats: ItemStats = emptyMap(),
    previous: IntervalQuestion? = null,
): IntervalQuestion {
    val interval = pickWeighted(intervalsFor(options.level), { weightOf(stats, it) }, random)
    val lows = lowNotesFor(interval, options.tuning, options.frets)
    val pool = if (lows.size > 1) lows.filter { !(interval == previous?.interval && it == previous.low) } else lows
    val low = pool[floor(random() * pool.size).toInt()]
    val directions = IntervalDirection.entries
    val direction = options.play.direction ?: directions[floor(random() * directions.size).toInt()]
    return IntervalQuestion(interval, low, direction)
}

/**
 * Where a note sits relative to a shape's lower note: on the same or a higher
 * string, closest in frets. Used to show a wrong answer next to the right one.
 */
fun positionNear(midi: Int, from: Position, tuning: Tuning, maxFret: Int): FretPosition? {
    val opens = openStringMidi(tuning)
    var best: Pair<FretPosition, Int>? = null
    for (string in from.string until opens.size) {
        val fret = midi - opens[string]
        if (fret < 0 || fret > maxFret) continue
        val cost = abs(fret - from.fret) * 10 + (string - from.string)
        if (best == null || cost < best.second) best = FretPosition(string, fret) to cost
    }
    return best?.first
}
