package com.perceptronics.musicteacher.core.theory

import kotlin.math.abs

// Port of src/theory/sequence.ts.

enum class Direction(val id: String) { UP("up"), DOWN("down"), UP_DOWN("upDown") }

val OCTAVES = listOf(1, 2)

/**
 * One or two octaves of the scale or chord from the starting root, played in a
 * single hand position: each pitch uses the fret closest to the starting fret,
 * preferring moving across strings over sliding up one string.
 */
fun buildPlaySequence(
    fretNotes: List<FretNote>,
    direction: Direction,
    loop: Boolean = false,
    octaves: Int = 1,
): List<FretNote> {
    val start = fretNotes.find { it.isStart } ?: return emptyList()

    val pitches = fretNotes.map { it.midi }.distinct()
        .filter { it >= start.midi && it <= start.midi + 12 * octaves }
        .sorted()

    val up = pitches.map { midi ->
        if (midi == start.midi) return@map start
        fretNotes.filter { it.midi == midi }.reduce { best, n ->
            val d = abs(n.fret - start.fret)
            val bestD = abs(best.fret - start.fret)
            if (d < bestD || (d == bestD && n.string > best.string)) n else best
        }
    }

    return when (direction) {
        Direction.UP -> up

        Direction.DOWN -> up.reversed()

        Direction.UP_DOWN -> {
            val down = up.dropLast(1).reversed()
            // When looping, the next pass starts on the root, so don't play it twice.
            up + if (loop) down.dropLast(1) else down
        }
    }
}
