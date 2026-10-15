package com.perceptronics.musicteacher.core.theory

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

// Port of src/theory/theory.test.ts and chords.test.ts.

private val fourString = getTuning("4-standard")!!

private fun chord(key: String, id: String) = resolveNoteSet(key, getChord(id))

class ResolveScaleTest {
    @Test
    fun spellsFMajorWithBbNotASharp() =
        assertEquals(listOf("F", "G", "A", "Bb", "C", "D", "E"), resolveScale("F", "major").notes)

    @Test
    fun spellsDMajorWithSharps() =
        assertEquals(listOf("D", "E", "F#", "G", "A", "B", "C#"), resolveScale("D", "major").notes)

    @Test
    fun picksTheEnharmonicTonicWithFewerAccidentals() {
        assertEquals("Db", resolveScale("C#", "major").tonic)
        assertEquals("C#", resolveScale("C#", "minor").tonic)
        assertEquals(listOf("Bb", "C", "D", "Eb", "F", "G", "A"), resolveScale("Bb", "major").notes)
    }

    @Test
    fun buildsModesFromTheCorrectIntervalFormulas() {
        assertEquals(listOf("D", "E", "F", "G", "A", "B", "C"), resolveScale("D", "dorian").notes)
        assertEquals(listOf(0, 2, 4, 6, 7, 9, 11), resolveScale("C", "lydian").semitones)
        assertEquals(listOf(0, 1, 3, 5, 6, 8, 10), resolveScale("C", "locrian").semitones)
        assertEquals(resolveScale("A", "aeolian").notes, resolveScale("A", "minor").notes)
    }

    @Test
    fun convertsNotesAndSpellsPitchClasses() {
        assertEquals(23, noteMidi("B0"))
        assertEquals(59, noteMidi("Cb4"))
        assertEquals(0, noteChroma("B#"))
        assertEquals("E##", spell('E', 6))
        assertEquals("Cb", spell('C', 11))
    }

    @Test
    fun labelsDegreesRelativeToTheMajorScale() {
        assertEquals(listOf("R", "2", "3", "4", "5", "6", "7"), resolveScale("C", "major").intervals)
        assertEquals(listOf("R", "b2", "b3", "4", "b5", "b6", "b7"), resolveScale("C", "locrian").intervals)
        assertEquals(listOf("R", "2", "3", "#4", "5", "6", "7"), resolveScale("C", "lydian").intervals)
    }

    @Test
    fun formatsInSpanishSolfege() {
        assertEquals("Fa♯", formatNote("F#", Locale.ES))
        assertEquals("La", formatNote("A", Locale.ES))
    }
}

class FretboardTest {
    @Test
    fun findsEveryDDorianNoteOnA24Fret4String() {
        val notes = getFretboardNotes(fourString, 24, resolveScale("D", "dorian"))
        assertEquals(
            listOf(0, 1, 3, 5, 7, 8, 10, 12, 13, 15, 17, 19, 20, 22, 24),
            notes.filter { it.string == 0 }.map { it.fret },
        )
        assertTrue(notes.all { '#' !in it.name && 'b' !in it.name })
    }

    @Test
    fun marksRootsAndTheLowestRootAsTheStartingNote() {
        val notes = getFretboardNotes(fourString, 24, resolveScale("A", "major"))
        val start = notes.filter { it.isStart }
        assertEquals(1, start.size)
        // A on the E string fret 5 ties open A; the thicker string wins.
        assertEquals(listOf(0, 5, 1), listOf(start[0].string, start[0].fret, start[0].degree))
        assertTrue(notes.filter { it.isRoot }.all { it.name == "A" })
    }

    @Test
    fun respectsTheFretCount() =
        assertEquals(20, getFretboardNotes(fourString, 20, resolveScale("C", "major")).maxOf { it.fret })

    @Test
    fun appliesAlternateTunings() {
        val dropD = getTuning("4-drop-d")!!
        assertEquals(openStringMidi(fourString)[0] - 2, openStringMidi(dropD)[0])
        val start = getFretboardNotes(dropD, 24, resolveScale("D", "major")).first { it.isStart }
        assertEquals(0 to 0, start.string to start.fret)
    }

    @Test
    fun supports5And6StringBasses() {
        val five = getFretboardNotes(getTuning("5-standard")!!, 24, resolveScale("E", "minor"))
        assertEquals(5, five.map { it.string }.toSet().size)
        // Low B string, fret 5 is E.
        assertEquals(0 to 5, five.first { it.isStart }.let { it.string to it.fret })
        val six = getFretboardNotes(getTuning("6-standard")!!, 24, resolveScale("C", "major"))
        assertEquals(6, six.map { it.string }.toSet().size)
    }
}

class PlaySequenceTest {
    private val notes = getFretboardNotes(fourString, 24, resolveScale("A", "major"))

    @Test
    fun playsOneOctaveInASingleHandPosition() {
        val seq = buildPlaySequence(notes, Direction.UP)
        assertEquals(listOf("A", "B", "C#", "D", "E", "F#", "G#", "A"), seq.map { it.name })
        assertEquals(
            listOf(0 to 5, 0 to 7, 1 to 4, 1 to 5, 1 to 7, 2 to 4, 2 to 6, 2 to 7),
            seq.map { it.string to it.fret },
        )
    }

    @Test
    fun reversesForDescending() = assertEquals(
        listOf("A", "G#", "F#", "E", "D", "C#", "B", "A"),
        buildPlaySequence(notes, Direction.DOWN).map { it.name },
    )

    @Test
    fun goesUpAndBackDownWithoutRepeatingTheRootWhenLooping() {
        assertEquals(15, buildPlaySequence(notes, Direction.UP_DOWN).size)
        assertEquals(14, buildPlaySequence(notes, Direction.UP_DOWN, loop = true).size)
    }
}

class ChordTest {
    @Test
    fun spellsEveryChordType() {
        val expected = listOf(
            Triple("C", "maj", "C E G"),
            Triple("A", "min", "A C E"),
            Triple("B", "dim", "B D F"),
            Triple("C", "aug", "C E G#"),
            Triple("D", "sus4", "D G A"),
            Triple("F", "maj7", "F A C E"),
            Triple("G", "dom7", "G B D F"),
            Triple("D", "m7", "D F A C"),
            Triple("B", "m7b5", "B D F A"),
            Triple("C", "dim7", "C Eb Gb Bbb"),
            Triple("C", "maj6", "C E G A"),
            Triple("A", "m6", "A C E F#"),
        )
        for ((key, id, notes) in expected) assertEquals(notes.split(' '), chord(key, id).notes, "$key $id")
    }

    @Test
    fun spellsSharpAndFlatKeysAccordingly() {
        assertEquals(listOf("F#", "A#", "C#", "E"), chord("F#", "dom7").notes)
        assertEquals(listOf("E", "G#", "B", "D#"), chord("E", "maj7").notes)
        assertEquals(listOf("Eb", "G", "Bb", "D"), chord("Eb", "maj7").notes)
        assertEquals(listOf("Ab", "C", "Eb", "Gb"), chord("Ab", "dom7").notes)
    }

    @Test
    fun avoidsAwkwardSpellingsLikeFb() = // Bbm7b5 would need Fb; A#m7b5 is A# C# E G#.
        assertEquals(listOf("A#", "C#", "E", "G#"), chord("Bb", "m7b5").notes)

    @Test
    fun labelsChordTonesByDegree() {
        assertEquals(listOf("R", "3", "5", "b7"), chord("G", "dom7").intervals)
        assertEquals(listOf("R", "b3", "b5", "bb7"), chord("C", "dim7").intervals)
        assertEquals(listOf("R", "3", "#5"), chord("C", "aug").intervals)
        assertEquals(listOf("R", "4", "5"), chord("D", "sus4").intervals)
    }

    @Test
    fun validatesChordIds() {
        assertEquals(12, CHORD_IDS.size)
        assertTrue(isChordId("m7b5"))
        assertTrue(!isChordId("add9"))
    }

    @Test
    fun playsTwoOctaveArpeggiosInOnePosition() {
        val notes = getFretboardNotes(fourString, 24, chord("G", "dom7"))
        assertEquals(setOf("G", "B", "D", "F"), notes.map { it.name }.toSet())
        val seq = buildPlaySequence(notes, Direction.UP, octaves = 2)
        assertEquals("G B D F G B D F G".split(' '), seq.map { it.name })
        assertEquals(24, seq.last().midi - seq.first().midi)
        assertTrue(seq.zipWithNext().all { (a, b) -> b.midi > a.midi })
    }
}
