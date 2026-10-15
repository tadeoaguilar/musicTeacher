package com.perceptronics.musicteacher.core.rhythm

// Port of src/rhythm/notation.ts.

enum class NoteValue(val id: String) {
    WHOLE("whole"),
    HALF("half"),
    QUARTER("quarter"),
    EIGHTH("eighth"),
    SIXTEENTH("sixteenth"),
}

private data class Value(val value: NoteValue, val dotted: Boolean = false, val triplet: Boolean = false)

private val VALUES = mapOf(
    192 to Value(NoteValue.WHOLE),
    144 to Value(NoteValue.HALF, dotted = true),
    96 to Value(NoteValue.HALF),
    72 to Value(NoteValue.QUARTER, dotted = true),
    48 to Value(NoteValue.QUARTER),
    36 to Value(NoteValue.EIGHTH, dotted = true),
    24 to Value(NoteValue.EIGHTH),
    18 to Value(NoteValue.SIXTEENTH, dotted = true),
    12 to Value(NoteValue.SIXTEENTH),
    16 to Value(NoteValue.EIGHTH, triplet = true),
    8 to Value(NoteValue.SIXTEENTH, triplet = true),
)

data class Glyph(
    val index: Int,
    val start: Int,
    val ticks: Int,
    val rest: Boolean,
    val value: NoteValue,
    val dotted: Boolean,
    val triplet: Boolean,
    /** Eighths/sixteenths not joined by a beam get flags. */
    val flagged: Boolean,
)

/** A lone sixteenth inside an eighth beam gets a short stub pointing left (-1) or right (1). */
data class Stub(val index: Int, val dir: Int)

data class Beam(
    val notes: List<Int>,
    /** Pairs of glyph indices joined by a second (sixteenth) beam. */
    val secondary: List<Pair<Int, Int>>,
    val stubs: List<Stub>,
)

data class Tuplet(val first: Int, val last: Int, val count: Int)

data class RhythmLayout(
    val glyphs: List<Glyph>,
    val beams: List<Beam>,
    val tuplets: List<Tuplet>,
    val barTicks: Int,
    val beatTicks: Int,
)

private fun isShort(g: Glyph) = !g.rest && (g.value == NoteValue.EIGHTH || g.value == NoteValue.SIXTEENTH)

/** Problems that would make a pattern unreadable; empty when the pattern is fine. */
fun validatePattern(pattern: Pattern, meterId: String): List<String> {
    val (_, _, _, beatTicks, barTicks) = getMeter(meterId)
    val errors = mutableListOf<String>()
    val total = pattern.events.sumOf { it.ticks }
    if (total != barTicks) errors += "${pattern.id}: fills $total of $barTicks ticks"
    val starts = eventStarts(pattern.events)
    pattern.events.forEachIndexed { i, e ->
        if (e.ticks !in VALUES) errors += "${pattern.id}[$i]: no note value for ${e.ticks} ticks"
        val onBeat = starts[i] % beatTicks == 0
        val sameBeat = starts[i] / beatTicks == (starts[i] + e.ticks - 1) / beatTicks
        if (!onBeat && !sameBeat) errors += "${pattern.id}[$i]: crosses a beat without starting on one"
    }
    return errors
}

/** Turns a one-bar pattern into notation: note values, beams within each beat, flags and tuplet brackets. */
fun layoutRhythm(pattern: Pattern, meterId: String): RhythmLayout {
    val (_, _, _, beatTicks, barTicks) = getMeter(meterId)
    val starts = eventStarts(pattern.events)
    fun beatOf(g: Glyph) = g.start / beatTicks

    val glyphs = pattern.events.mapIndexed { index, e ->
        val v = VALUES[e.ticks] ?: throw IllegalArgumentException("No note value for ${e.ticks} ticks")
        Glyph(index, starts[index], e.ticks, e.rest, v.value, v.dotted, v.triplet, flagged = false)
    }.toMutableList()

    // Beam consecutive eighths/sixteenths that share a beat; rests break the beam.
    val beams = mutableListOf<Beam>()
    var run = mutableListOf<Glyph>()
    fun flush() {
        if (run.size == 1) glyphs[run[0].index] = run[0].copy(flagged = true)
        if (run.size > 1) {
            val secondary = mutableListOf<Pair<Int, Int>>()
            val stubs = mutableListOf<Stub>()
            run.forEachIndexed { i, g ->
                if (g.value != NoteValue.SIXTEENTH) return@forEachIndexed
                val prev = run.getOrNull(i - 1)
                val next = run.getOrNull(i + 1)
                if (next?.value == NoteValue.SIXTEENTH) secondary += g.index to next.index
                if (prev?.value != NoteValue.SIXTEENTH && next?.value != NoteValue.SIXTEENTH) {
                    stubs += Stub(g.index, if (next != null) 1 else -1)
                }
            }
            beams += Beam(run.map { it.index }, secondary, stubs)
        }
        run = mutableListOf()
    }
    for (g in glyphs.toList()) {
        if (!isShort(g) || (run.isNotEmpty() && beatOf(run[0]) != beatOf(g))) flush()
        if (isShort(g)) run += g
    }
    flush()

    // One bracket per beat of triplets.
    val tuplets = mutableListOf<Tuplet>()
    for (g in glyphs) {
        if (!g.triplet) continue
        val last = tuplets.lastOrNull()
        if (last != null && last.last == g.index - 1 && beatOf(glyphs[last.first]) == beatOf(g)) {
            tuplets[tuplets.lastIndex] = last.copy(last = g.index, count = last.count + 1)
        } else {
            tuplets += Tuplet(g.index, g.index, 1)
        }
    }

    return RhythmLayout(glyphs, beams, tuplets, barTicks, beatTicks)
}
