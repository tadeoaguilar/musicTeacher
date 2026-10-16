package com.perceptronics.musicteacher.ui.fretboard

import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

// Port of src/components/Fretboard/geometry.ts. Units are the web's SVG units; the composable scales them.

private const val LABEL_COL = 30f // string names
private const val OPEN_COL = 50f // open-string (fret 0) notes, left of the nut
private const val AVG_FRET = 56f
private const val PAD_RIGHT = 16f
private const val TOP = 34f
const val STRING_GAP = 44f
private const val BOTTOM = 30f // fret numbers

/**
 * Real frets shrink toward the body: x(n) = L·(1 − 2^(−n/12)). Blending that
 * with even spacing keeps the realistic look while high frets stay tappable.
 */
private const val REALISM = 0.5f

val INLAY_FRETS = listOf(3, 5, 7, 9, 15, 17, 19, 21)
val DOUBLE_INLAY_FRETS = listOf(12, 24)

class FretboardLayout(val stringCount: Int, val fretCount: Int, val leftHanded: Boolean) {
    val nutX = LABEL_COL + OPEN_COL
    private val neckLen = fretCount * AVG_FRET
    val width = nutX + neckLen + PAD_RIGHT
    private val realEnd = 1 - 2f.pow(-fretCount / 12f)
    val neckTop = TOP - STRING_GAP / 2
    val neckBottom = TOP + (stringCount - 1) * STRING_GAP + STRING_GAP / 2
    val height = neckBottom + BOTTOM
    val stringLabelX = LABEL_COL / 2

    /** Raw x of fret wire n (n = 0 is the nut), before mirroring. */
    fun fretWireX(n: Int) =
        nutX + neckLen * ((1 - REALISM) * (n.toFloat() / fretCount) + REALISM * (1 - 2f.pow(-n / 12f)) / realEnd)

    /** Center x where a note on fret n is drawn, before mirroring. */
    fun noteX(fret: Int) = if (fret == 0) LABEL_COL + OPEN_COL / 2 - 2 else (fretWireX(fret - 1) + fretWireX(fret)) / 2

    /** Lowest string at the bottom, as the player sees it looking down at the bass. */
    fun stringY(string: Int) = TOP + (stringCount - 1 - string) * STRING_GAP

    /** Applies left-handed mirroring to any x. */
    fun x(rawX: Float) = if (leftHanded) width - rawX else rawX

    /** The tappable span of a fret: the open-string column, or between two wires. */
    fun cellEdges(fret: Int) = if (fret == 0) nutX - 46 to nutX else fretWireX(fret - 1) to fretWireX(fret)

    /** The string and fret under a tap (in layout units), or null outside the neck. */
    fun hit(px: Float, py: Float): Pair<Int, Int>? {
        val string = (0 until stringCount).find { abs(py - stringY(it)) <= STRING_GAP / 2 } ?: return null
        val fret = (0..fretCount).find { fret ->
            val (a, b) = cellEdges(fret).let { (a, b) -> x(a) to x(b) }
            px >= min(a, b) && px <= max(a, b)
        } ?: return null
        return string to fret
    }
}
