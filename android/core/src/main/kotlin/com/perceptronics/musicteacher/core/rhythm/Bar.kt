package com.perceptronics.musicteacher.core.rhythm

import kotlin.math.abs
import kotlin.math.floor

// Port of src/rhythm/bar.ts.

/** A = accented click, N = normal click, S = silent beat. */
enum class Accent { A, N, S }

/** Tapping a beat light cycles accent → normal → silent. */
fun cycleAccent(accent: Accent): Accent = when (accent) {
    Accent.A -> Accent.N
    Accent.N -> Accent.S
    Accent.S -> Accent.A
}

fun defaultAccents(beats: Int): List<Accent> = List(beats) { if (it == 0) Accent.A else Accent.N }

data class BarSettings(
    val meter: String,
    val sub: Int,
    /** 0 = straight, 1 = full triplet swing. */
    val swing: Double,
    val accents: List<Accent>,
    /** Pattern the bass plays, if any. */
    val pattern: Pattern?,
)

enum class BarEventKind(val id: String) { ACCENT("accent"), NORMAL("normal"), SUB("sub"), BASS("bass") }

/** One sound in a bar, `at` in beats from the downbeat; bass notes also have a duration and pattern index. */
data class BarEvent(
    val kind: BarEventKind,
    val at: Double,
    val beat: Int,
    val duration: Double? = null,
    val index: Int? = null,
)

/**
 * Moves swung off-beats later. `unit` is the swung note length in beats (½ for
 * eighths, ¼ for sixteenths): at full swing the off-beat lands on the last
 * triplet of each pair, ⅔ of the way through.
 */
fun swingPosition(at: Double, unit: Double, amount: Double): Double {
    val pair = unit * 2
    val within = at % pair
    if (abs(within - unit) > 1e-9) return at
    return at - within + unit + (amount * unit) / 3
}

/** Every sound in one bar, timed in beats from the downbeat (multiply by 60/BPM for seconds). */
fun buildBar(settings: BarSettings): List<BarEvent> {
    val meter = getMeter(settings.meter)
    val sub = settings.sub
    val swingUnit = if (canSwing(meter, sub) && settings.swing > 0) 1.0 / sub else null
    val place = { at: Double -> if (swingUnit != null) swingPosition(at, swingUnit, settings.swing) else at }
    val events = mutableListOf<BarEvent>()

    for (beat in 0 until meter.beats) {
        val accent = settings.accents.getOrNull(beat) ?: Accent.N
        if (accent == Accent.S) continue
        events += BarEvent(if (accent == Accent.A) BarEventKind.ACCENT else BarEventKind.NORMAL, beat.toDouble(), beat)
        for (k in 1 until sub) events += BarEvent(BarEventKind.SUB, place(beat + k.toDouble() / sub), beat)
    }

    settings.pattern?.let { pattern ->
        val starts = eventStarts(pattern.events)
        pattern.events.forEachIndexed { index, e ->
            if (e.rest) return@forEachIndexed
            val at = place(starts[index].toDouble() / meter.beatTicks)
            events += BarEvent(BarEventKind.BASS, at, floor(at).toInt(), e.ticks.toDouble() / meter.beatTicks, index)
        }
    }

    return events.sortedBy { it.at }
}
