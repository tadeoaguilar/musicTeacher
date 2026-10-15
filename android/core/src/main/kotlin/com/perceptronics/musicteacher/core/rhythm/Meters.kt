package com.perceptronics.musicteacher.core.rhythm

// Port of src/rhythm/meters.ts.

/** Rhythm positions are measured in ticks: 48 per quarter note, so triplets and sixteenths are whole numbers. */
const val TICKS_PER_QUARTER = 48

val METER_IDS = listOf("2/4", "3/4", "4/4", "6/8", "9/8", "12/8")

fun isMeterId(value: String) = value in METER_IDS

data class Meter(
    val id: String,
    /** Pulses per bar: quarters in simple meters, dotted quarters in compound ones (6/8 → 2). */
    val beats: Int,
    val compound: Boolean,
    val beatTicks: Int,
    val barTicks: Int,
)

fun getMeter(id: String): Meter {
    val top = id.substringBefore('/').toInt()
    val compound = id.endsWith("/8")
    val beats = if (compound) top / 3 else top
    val beatTicks = if (compound) TICKS_PER_QUARTER * 3 / 2 else TICKS_PER_QUARTER
    return Meter(id, beats, compound, beatTicks, beats * beatTicks)
}

/** Clicks per beat. Simple meters: quarter, eighths, triplets, sixteenths, sixteenth triplets. */
fun subdivisionsFor(meter: Meter): List<Int> = // Compound beats split naturally into three eighths (or six sixteenths).
    if (meter.compound) listOf(1, 3, 6) else listOf(1, 2, 3, 4, 6)

/** Swing only makes sense for straight eighths or sixteenths. */
fun canSwing(meter: Meter, sub: Int) = !meter.compound && (sub == 2 || sub == 4)
