package com.perceptronics.musicteacher.core.parity

import com.perceptronics.musicteacher.core.theory.CHORD_IDS
import com.perceptronics.musicteacher.core.theory.Direction
import com.perceptronics.musicteacher.core.theory.FRET_COUNTS
import com.perceptronics.musicteacher.core.theory.KEY_IDS
import com.perceptronics.musicteacher.core.theory.LETTERS
import com.perceptronics.musicteacher.core.theory.Locale
import com.perceptronics.musicteacher.core.theory.SCALE_IDS
import com.perceptronics.musicteacher.core.theory.TUNINGS
import com.perceptronics.musicteacher.core.theory.buildPlaySequence
import com.perceptronics.musicteacher.core.theory.formatInterval
import com.perceptronics.musicteacher.core.theory.formatNote
import com.perceptronics.musicteacher.core.theory.getChord
import com.perceptronics.musicteacher.core.theory.getFretboardNotes
import com.perceptronics.musicteacher.core.theory.getTuning
import com.perceptronics.musicteacher.core.theory.midiToFrequency
import com.perceptronics.musicteacher.core.theory.openStringMidi
import com.perceptronics.musicteacher.core.theory.positionKey
import com.perceptronics.musicteacher.core.theory.resolveNoteSet
import com.perceptronics.musicteacher.core.theory.resolveScale
import com.perceptronics.musicteacher.core.theory.spell
import kotlin.test.Test
import kotlin.test.assertEquals

/** src/theory against the web app's results (fixtures/theory.json). */
class TheoryParityTest {
    private val f = Fixtures.load("theory")

    @Test
    fun notes() {
        assertEquals(f["letters"].strings(), LETTERS.map { it.toString() })
        for (row in f["spell"].array) assertEquals(row[2].str, spell(row[0].str[0], row[1].int))
        for (row in f["format"].array) {
            assertEquals(row[1].str, formatNote(row[0].str, Locale.EN))
            assertEquals(row[2].str, formatNote(row[0].str, Locale.ES))
        }
        for (row in f["formatInterval"].array) assertEquals(row[1].str, formatInterval(row[0].str))
        for (row in f["frequencies"].array) assertClose(row[2].double, midiToFrequency(row[0].int, row[1].double))
    }

    @Test
    fun everyScaleAndChordInEveryKey() {
        assertEquals(f["scales"].array.map { it["id"].str }.distinct(), SCALE_IDS)
        assertEquals(f["chords"].array.map { it["id"].str }, CHORD_IDS)
        assertEquals(f["scales"].array.map { it["key"].str }.distinct(), KEY_IDS)
        for (s in f["scales"].array) {
            val set = resolveScale(s["key"].str, s["id"].str)
            val label = "${s["key"].str} ${s["id"].str}"
            assertEquals(s["tonic"].str, set.tonic, label)
            assertEquals(s["notes"].strings(), set.notes, label)
            assertEquals(s["intervals"].strings(), set.intervals, label)
            assertEquals(s["semitones"].ints(), set.semitones, label)
        }
        for (c in f["chords"].array) {
            val chord = getChord(c["id"].str)
            assertEquals(c["semitones"].ints(), chord.semitones)
            assertEquals(c["degrees"].ints(), chord.degrees)
            assertEquals(c["symbol"].str, chord.symbol)
            assertEquals(c["group"].str, chord.group.name.lowercase())
        }
        for (c in f["chordSets"].array) {
            val set = resolveNoteSet(c["key"].str, getChord(c["id"].str))
            val label = "${c["key"].str} ${c["id"].str}"
            assertEquals(c["tonic"].str, set.tonic, label)
            assertEquals(c["notes"].strings(), set.notes, label)
            assertEquals(c["intervals"].strings(), set.intervals, label)
        }
    }

    @Test
    fun tunings() {
        assertEquals(f["tunings"].array.map { it["id"].str }, TUNINGS.map { it.id })
        for (t in f["tunings"].array) {
            val tuning = getTuning(t["id"].str)!!
            assertEquals(t["nameKey"].str, tuning.nameKey)
            assertEquals(t["strings"].strings(), tuning.strings)
            assertEquals(t["open"].ints(), openStringMidi(tuning))
        }
        assertEquals(f["fretCounts"].array.map { it["frets"].int }, FRET_COUNTS)
        for (c in f["fretCounts"].array) {
            assertEquals(
                c["count"].int,
                getFretboardNotes(getTuning("4-standard")!!, c["frets"].int, resolveScale("A", "minor")).size,
            )
        }
    }

    private val noteSets = mapOf(
        "C major" to resolveScale("C", "major"),
        "F# dorian" to resolveScale("F#", "dorian"),
        "Bb locrian" to resolveScale("Bb", "locrian"),
        "G dom7" to resolveNoteSet("G", getChord("dom7")),
        "C# dim7" to resolveNoteSet("C#", getChord("dim7")),
        "E m6" to resolveNoteSet("E", getChord("m6")),
    )

    @Test
    fun fretboardsAndPlaySequences() {
        for (case in f["fretboards"].array) {
            val label = "${case["tuning"].str} ${case["set"].str}"
            val notes = getFretboardNotes(getTuning(case["tuning"].str)!!, 24, noteSets.getValue(case["set"].str))
            val expected = case["notes"].array.map { n ->
                listOf(n[0].int, n[1].int, n[2].int, n[3].str, n[4].str, n[5].int, n[6].int == 1, n[7].int == 1)
            }
            assertEquals(
                expected,
                notes.map {
                    listOf(it.string, it.fret, it.midi, it.name, it.interval, it.degree, it.isRoot, it.isStart)
                },
                label,
            )
            for (seq in case["sequences"].array) {
                val dir = Direction.entries.first { it.id == seq["dir"].str }
                val actual = buildPlaySequence(notes, dir, seq["loop"].bool, seq["oct"].int).map(::positionKey)
                assertEquals(
                    seq["positions"].strings(),
                    actual,
                    "$label ${seq["dir"].str} ${seq["loop"]} ${seq["oct"]}",
                )
            }
        }
    }
}
