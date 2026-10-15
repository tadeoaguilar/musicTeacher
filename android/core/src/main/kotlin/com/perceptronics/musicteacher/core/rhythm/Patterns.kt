package com.perceptronics.musicteacher.core.rhythm

// Port of src/rhythm/patterns.ts.

/** One note or rest; patterns are a sequence of these filling exactly one bar. */
data class RhythmEvent(val ticks: Int, val rest: Boolean = false)

enum class PatternGroup { BASIC, GROOVE }

data class Pattern(val id: String, val group: PatternGroup, val meters: List<String>, val events: List<RhythmEvent>)

private fun n(ticks: Int) = RhythmEvent(ticks)

private fun r(ticks: Int) = RhythmEvent(ticks, rest = true)

private fun times(count: Int, vararg events: RhythmEvent) = List(count) { events.toList() }.flatten()

// Note lengths in ticks.
private const val W = 192
private const val H = 96
private const val DQ = 72
private const val Q = 48
private const val E = 24
private const val S = 12
private const val T = 16 // eighth-note triplet

private fun basic(id: String, meter: String, events: List<RhythmEvent>) =
    Pattern(id, PatternGroup.BASIC, listOf(meter), events)

private fun groove(id: String, meter: String, events: List<RhythmEvent>) =
    Pattern(id, PatternGroup.GROOVE, listOf(meter), events)

val PATTERNS: List<Pattern> = listOf(
    // Reading basics, 4/4
    basic("wholes", "4/4", listOf(n(W))),
    basic("halves", "4/4", times(2, n(H))),
    basic("quarters", "4/4", times(4, n(Q))),
    basic("eighths", "4/4", times(8, n(E))),
    basic("sixteenths", "4/4", times(16, n(S))),
    basic("triplets", "4/4", times(12, n(T))),
    basic("oneAndThree", "4/4", times(2, n(Q), r(Q))),
    basic("offbeats", "4/4", times(4, r(E), n(E))),
    basic("gallop", "4/4", times(4, n(E), n(S), n(S))),
    basic("reverseGallop", "4/4", times(4, n(S), n(S), n(E))),
    // Reading basics, other simple meters
    basic("quarters", "2/4", times(2, n(Q))),
    basic("eighths", "2/4", times(4, n(E))),
    basic("quarters", "3/4", times(3, n(Q))),
    basic("eighths", "3/4", times(6, n(E))),
) + listOf("6/8", "9/8", "12/8").flatMap { meter ->
    // Reading basics, compound meters
    val beats = getMeter(meter).beats
    listOf(
        basic("dottedQuarters", meter, times(beats, n(DQ))),
        basic("compoundEighths", meter, times(beats * 3, n(E))),
        basic("quarterEighth", meter, times(beats, n(Q), n(E))),
    )
} + listOf(
    // Bass grooves
    groove("motown", "4/4", listOf(n(DQ), n(E), n(Q), n(Q))),
    groove("funk", "4/4", listOf(n(S), r(E), n(S), r(E), n(E), n(S), n(S), r(E), r(E), n(E))),
    groove("oneDrop", "4/4", listOf(r(Q), n(E), n(E), n(Q), r(Q))),
    groove("tumbao", "4/4", listOf(r(Q), r(E), n(E), r(Q), n(Q))),
    groove("bossa", "4/4", listOf(n(DQ), n(E), n(DQ), n(E))),
    groove("waltz", "3/4", listOf(n(Q), r(Q), r(Q))),
    groove("shuffle", "12/8", times(4, n(Q), n(E))),
    groove("afro68", "6/8", listOf(n(E), r(E), n(E), n(Q), n(E))),
)

fun patternsFor(meter: String): List<Pattern> = PATTERNS.filter { meter in it.meters }

fun findPattern(meter: String, id: String): Pattern? = patternsFor(meter).find { it.id == id }

/** The rhythm the clicks spell out when no pattern is chosen, so there is always something to read. */
fun subdivisionPattern(meterId: String, sub: Int): Pattern {
    val meter = getMeter(meterId)
    return basic("sub-$sub", meterId, times(meter.beats * sub, n(meter.beatTicks / sub)))
}

/** Start tick of each event. */
fun eventStarts(events: List<RhythmEvent>): List<Int> = events.runningFold(0) { t, e -> t + e.ticks }.dropLast(1)
