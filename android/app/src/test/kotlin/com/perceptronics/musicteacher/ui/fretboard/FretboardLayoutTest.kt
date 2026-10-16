package com.perceptronics.musicteacher.ui.fretboard

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class FretboardLayoutTest {
    private val layout = FretboardLayout(stringCount = 4, fretCount = 24, leftHanded = false)

    @Test
    fun matchesTheWebGeometry() {
        assertEquals(1440f, layout.width)
        assertEquals(218f, layout.height)
        assertEquals(80f, layout.fretWireX(0))
        assertEquals(1424f, layout.fretWireX(24), 0.01f)
        // The low E string is drawn at the bottom.
        assertEquals(166f, layout.stringY(0))
        assertEquals(34f, layout.stringY(3))
    }

    @Test
    fun fretsShrinkTowardTheBody() {
        val first = layout.fretWireX(1) - layout.fretWireX(0)
        val last = layout.fretWireX(24) - layout.fretWireX(23)
        assertTrue(first > last)
    }

    @Test
    fun findsTheTappedFret() {
        assertEquals(0 to 5, layout.hit(layout.noteX(5), layout.stringY(0)))
        assertEquals(3 to 0, layout.hit(layout.noteX(0), layout.stringY(3) + 10))
        assertNull(layout.hit(5f, layout.stringY(0)))
        assertNull(layout.hit(layout.noteX(5), layout.height))
    }

    @Test
    fun mirrorsForLeftHanders() {
        val lefty = FretboardLayout(stringCount = 4, fretCount = 24, leftHanded = true)
        assertEquals(0 to 7, lefty.hit(lefty.x(lefty.noteX(7)), lefty.stringY(0)))
        assertEquals(layout.width - layout.noteX(7), lefty.x(lefty.noteX(7)))
    }
}
