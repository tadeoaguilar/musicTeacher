package com.perceptronics.musicteacher.core.ear

import com.perceptronics.musicteacher.core.theory.FretPosition
import com.perceptronics.musicteacher.core.theory.getTuning
import com.perceptronics.musicteacher.core.theory.noteMidi
import com.perceptronics.musicteacher.core.theory.openStringMidi
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

// Port of src/ear/ear.test.ts and intervals.test.ts.

private val fourString = getTuning("4-standard")!!

private fun options(level: Int) = FindNoteOptions(fourString, 24, level)

class FindNoteTest {
    @Test
    fun repeatsTheSameSequenceForTheSameSeed() {
        val a = createRandom(42)
        val b = createRandom(42)
        assertEquals(List(5) { a() }, List(5) { b() })
    }

    @Test
    fun picksHeavierItemsMoreOften() {
        val random = createRandom(1)
        val heavy = (1..2000).count { pickWeighted(listOf("a", "b"), { if (it == "a") 3.0 else 1.0 }, random) == "a" }
        assertEquals(0.75, heavy / 2000.0, 0.05)
    }

    @Test
    fun keepsLevel1ToNaturalNotesInTheFirstFiveFrets() {
        val midis = candidates(options(1))
        assertTrue(midis.none { pitchClassOf(it).length > 1 })
        assertEquals(noteMidi("E1"), midis.min())
        assertEquals(noteMidi("C3"), midis.max())
    }

    @Test
    fun opensUpAllNotesToFret12ThenTheWholeNeck() {
        assertEquals(12, maxFretFor(2, 24))
        assertTrue(noteMidi("F#1") in candidates(options(2)))
        assertEquals(noteMidi("G4"), candidates(options(3)).max())
        assertEquals(21, maxFretFor(3, 21))
    }

    @Test
    fun staysInRangeNeverRepeatsAndIsDeterministic() {
        fun run(): List<Int> {
            val random = createRandom(7)
            var q = nextQuestion(options(1), random)
            return List(50) {
                val next = nextQuestion(options(1), random, emptyMap(), q)
                assertNotEquals(q.midi, next.midi)
                assertTrue(next.midi in candidates(options(1)))
                q = next
                next.midi
            }
        }
        assertEquals(run(), run())
    }

    @Test
    fun asksAboutMissedNotesMoreOften() {
        val stats = mapOf("F" to Counts(0, 6), "C" to Counts(8, 0))
        val random = createRandom(3)
        val counts = List(3000) { nextQuestion(options(1), random, stats).pitchClass }.groupingBy { it }.eachCount()
        assertTrue(counts.getValue("F") > counts.getValue("C") * 2)
    }

    private val a1 = FindNoteQuestion(noteMidi("A1"), "A")

    @Test
    fun judgesAnswers() {
        assertEquals(Verdict.EXACT, judge(a1, noteMidi("A1")))
        assertEquals(Verdict.HIGHER, judge(a1, noteMidi("A2")))
        assertEquals(Verdict.LOWER, judge(FindNoteQuestion(noteMidi("A2"), "A"), noteMidi("A1")))
        assertEquals(Verdict.WRONG, judge(a1, noteMidi("Bb1")))
        assertEquals(listOf(FretPosition(0, 5), FretPosition(1, 0)), positionsOf(noteMidi("A1"), fourString, 12))
        assertEquals(
            listOf(FretPosition(1, 12), FretPosition(2, 7), FretPosition(3, 2)),
            otherOctaves(noteMidi("A1"), fourString, 12),
        )
    }

    @Test
    fun tracksScoreStreaksAndWeights() {
        var s = EMPTY_SCORE
        for (correct in listOf(true, true, false, true)) s = addToScore(s, correct)
        assertEquals(Score(3, 4, 1, 2), s)
        var stats: ItemStats = recordAnswer(emptyMap(), "F", false)
        stats = recordAnswer(stats, "F", false)
        repeat(5) { stats = recordAnswer(stats, "C", true) }
        assertTrue(weightOf(stats, "F") > weightOf(stats, "G"))
        assertTrue(weightOf(stats, "G") > weightOf(stats, "C"))
        val ranked = linkedMapOf("F" to Counts(1, 3), "B" to Counts(3, 1), "C" to Counts(5, 0))
        assertEquals(listOf("F", "B"), weakest(ranked))
    }
}

class IntervalsTest {
    private fun options(level: Int = 3, frets: Int = 24, play: PlayMode = PlayMode.UP) =
        IntervalOptions(fourString, frets, level, play)

    private fun shape(low: String, high: String) = shapeOf(noteMidi(low), noteMidi(high), fourString, 12)

    @Test
    fun sizesIntervalsAndPlaysTheHigherNoteFirstWhenDescending() {
        assertEquals(listOf(1, 6, 7, 12), listOf("m2", "TT", "P5", "P8").map(::semitonesOf))
        val up = IntervalQuestion("P5", noteMidi("A1"), IntervalDirection.UP)
        assertEquals(noteMidi("E2"), highOf(up))
        assertEquals(noteMidi("A1"), firstOf(up))
        assertEquals(noteMidi("E2"), firstOf(up.copy(direction = IntervalDirection.DOWN)))
        assertEquals(listOf("P4", "P5", "P8"), intervalsFor(1))
        assertEquals(INTERVAL_IDS, intervalsFor(3))
    }

    @Test
    fun findsBassShapes() {
        assertEquals(Shape(FretPosition(1, 2), FretPosition(2, 4)), shape("B1", "F#2"))
        assertEquals(Shape(FretPosition(1, 0), FretPosition(2, 2)), shape("A1", "E2"))
        assertEquals(Shape(FretPosition(1, 3), FretPosition(2, 3)), shape("C2", "F2"))
        assertEquals(Shape(FretPosition(0, 3), FretPosition(2, 5)), shape("G1", "G2"))
        assertNull(shape("D1", "A1"))
        for (id in INTERVAL_IDS) {
            for (low in lowNotesFor(id, fourString, 24)) {
                val s = shapeOf(low, low + semitonesOf(id), fourString, INTERVAL_MAX_FRET)!!
                assertTrue(s.high.string >= s.low.string)
                assertEquals(low, openStringMidi(fourString)[s.low.string] + s.low.fret)
            }
        }
    }

    @Test
    fun asksQuestionsWithinTheLevelAndNeverRepeats() {
        val random = createRandom(7)
        for (level in 1..3) {
            repeat(200) {
                val q = nextIntervalQuestion(options(level, frets = 20), random)
                assertTrue(q.interval in intervalsFor(level))
            }
        }
        var previous = nextIntervalQuestion(options(1), random)
        repeat(300) {
            val q = nextIntervalQuestion(options(1), random, emptyMap(), previous)
            assertTrue(!(q.interval == previous.interval && q.low == previous.low))
            previous = q
        }
    }

    @Test
    fun usesTheChosenDirectionOrMixesAllThree() {
        val random = createRandom(9)
        assertEquals(IntervalDirection.DOWN, nextIntervalQuestion(options(play = PlayMode.DOWN), random).direction)
        val seen = List(60) { nextIntervalQuestion(options(play = PlayMode.MIXED), random).direction }.toSet()
        assertEquals(IntervalDirection.entries.toSet(), seen)
    }

    @Test
    fun placesAWrongAnswerNextToTheShape() {
        assertEquals(FretPosition(2, 3), positionNear(noteMidi("F2"), FretPosition(0, 5), fourString, 12))
        assertEquals(FretPosition(0, 6), positionNear(noteMidi("A#1"), FretPosition(0, 5), fourString, 12))
    }
}
