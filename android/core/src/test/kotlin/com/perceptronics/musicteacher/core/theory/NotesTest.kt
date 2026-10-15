package com.perceptronics.musicteacher.core.theory

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull

class NotesTest {
    @Test
    fun parsesNoteNames() {
        assertEquals(ParsedNote('B', "b", null), parseNote("Bb"))
        assertEquals(ParsedNote('F', "#", 2), parseNote("F#2"))
        assertEquals(ParsedNote('E', "bb", 1), parseNote("Ebb1"))
        assertNull(parseNote("H"))
        assertNull(parseNote("C###"))
    }

    @Test
    fun computesPitchClassesAndMidi() {
        assertEquals(10, noteChroma("Bb"))
        assertEquals(11, noteChroma("Cb"))
        assertEquals(28, noteMidi("E1"))
        assertEquals(34, noteMidi("A#1"))
        assertEquals(69, noteMidi("A4"))
        assertFailsWith<IllegalArgumentException> { noteMidi("E") }
    }

    @Test
    fun spellsALetterToAPitchClass() {
        assertEquals("Bb", spell('B', 10))
        assertEquals("F#", spell('F', 6))
        assertEquals("Bbb", spell('B', 9))
        assertEquals("E#", spell('E', 5))
    }

    @Test
    fun formatsNotesInEnglishAndSpanish() {
        assertEquals("B♭", formatNote("Bb", Locale.EN))
        assertEquals("Si♭", formatNote("Bb", Locale.ES))
        assertEquals("Sol", formatNote("G2", Locale.ES))
        assertEquals("♭3", formatInterval("b3"))
    }

    @Test
    fun convertsBetweenMidiAndFrequency() {
        assertEquals(440.0, midiToFrequency(69), 1e-9)
        assertEquals(55.0, midiToFrequency(33), 1e-9)
        assertEquals(432.0, midiToFrequency(69, 432.0), 1e-9)
        assertEquals(33.0, frequencyToMidi(55.0), 1e-9)
    }
}
