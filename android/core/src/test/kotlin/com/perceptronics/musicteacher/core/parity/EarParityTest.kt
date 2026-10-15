package com.perceptronics.musicteacher.core.parity

import com.perceptronics.musicteacher.core.ear.Counts
import com.perceptronics.musicteacher.core.ear.EMPTY_SCORE
import com.perceptronics.musicteacher.core.ear.FindNoteOptions
import com.perceptronics.musicteacher.core.ear.FindNoteQuestion
import com.perceptronics.musicteacher.core.ear.INTERVAL_IDS
import com.perceptronics.musicteacher.core.ear.IntervalOptions
import com.perceptronics.musicteacher.core.ear.ItemStats
import com.perceptronics.musicteacher.core.ear.PlayMode
import com.perceptronics.musicteacher.core.ear.addToScore
import com.perceptronics.musicteacher.core.ear.candidates
import com.perceptronics.musicteacher.core.ear.createRandom
import com.perceptronics.musicteacher.core.ear.intervalsFor
import com.perceptronics.musicteacher.core.ear.judge
import com.perceptronics.musicteacher.core.ear.lowNotesFor
import com.perceptronics.musicteacher.core.ear.maxFretFor
import com.perceptronics.musicteacher.core.ear.nextIntervalQuestion
import com.perceptronics.musicteacher.core.ear.nextQuestion
import com.perceptronics.musicteacher.core.ear.otherOctaves
import com.perceptronics.musicteacher.core.ear.pickWeighted
import com.perceptronics.musicteacher.core.ear.positionNear
import com.perceptronics.musicteacher.core.ear.positionsOf
import com.perceptronics.musicteacher.core.ear.recordAnswer
import com.perceptronics.musicteacher.core.ear.semitonesOf
import com.perceptronics.musicteacher.core.ear.shapeOf
import com.perceptronics.musicteacher.core.ear.weakest
import com.perceptronics.musicteacher.core.ear.weightOf
import com.perceptronics.musicteacher.core.theory.FretPosition
import com.perceptronics.musicteacher.core.theory.getTuning
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlinx.serialization.json.JsonElement

/** src/ear against the web app's results (fixtures/ear.json), including the seeded question sequences. */
class EarParityTest {
    private val f = Fixtures.load("ear")
    private val fourString = getTuning("4-standard")!!
    private val stats: ItemStats = linkedMapOf("F" to Counts(0, 6), "C" to Counts(8, 0), "P4" to Counts(1, 3))

    private fun position(e: JsonElement) = FretPosition(e["string"].int, e["fret"].int)

    private fun positions(e: JsonElement) = e.array.map(::position)

    @Test
    fun randomGeneratorIsBitForBitTheSame() {
        for (r in f["random"].array) {
            val random = createRandom(r["seed"].long)
            r["values"].array.forEach { assertEquals(it.double, random(), "seed ${r["seed"]}") }
        }
        val random = createRandom(42)
        assertEquals(
            f["weighted"].strings(),
            List(50) {
                pickWeighted(listOf("a", "b", "c"), { x ->
                    if (x ==
                        "a"
                    ) {
                        3.0
                    } else {
                        1.0
                    }
                }, random)
            },
        )
    }

    @Test
    fun progress() {
        var score = EMPTY_SCORE
        var recorded: ItemStats = emptyMap()
        val answers = listOf(true, true, false, true, false, false, true)
        f["answers"].array.zip(answers).forEachIndexed { i, (expected, correct) ->
            score = addToScore(score, correct)
            recorded = recordAnswer(recorded, listOf("F", "C", "F", "G")[i % 4], correct)
            val s = expected["score"]
            assertEquals(
                listOf(s["right"].int, s["total"].int, s["streak"].int, s["best"].int),
                listOf(score.right, score.total, score.streak, score.best),
            )
            assertEquals(
                expected["recorded"].jsonObjectEntries().map { (k, v) -> k to Counts(v["right"].int, v["wrong"].int) },
                recorded.entries.map { it.key to it.value },
            )
        }
        for (row in f["weights"].array) assertClose(row[1].double, weightOf(stats, row[0].str))
        val ranked = LinkedHashMap(stats).apply {
            put("B", Counts(3, 1))
            put("E", Counts(1, 3))
        }
        assertEquals(f["weakest"].strings(), weakest(ranked))
    }

    @Test
    fun findTheNoteQuestionSequences() {
        for (run in f["questionRuns"].array) {
            val tuning = getTuning(run["tuning"].str)!!
            val level = run["level"].int
            val options = FindNoteOptions(tuning, 22, level)
            assertEquals(run["candidates"].ints(), candidates(options))
            assertEquals(run["max"].int, maxFretFor(level, 22))
            val random = createRandom(level * 100L + tuning.strings.size)
            var q = nextQuestion(options, random, stats)
            val asked = mutableListOf(q)
            repeat(30) { asked += nextQuestion(options, random, stats, q).also { q = it } }
            assertEquals(
                run["asked"].array.map { FindNoteQuestion(it["midi"].int, it["pitchClass"].str) },
                asked,
                "${tuning.id} level $level",
            )
        }
        for (p in f["positions"].array) {
            assertEquals(positions(p["positions"]), positionsOf(p["midi"].int, fourString, 24))
            assertEquals(positions(p["octaves"]), otherOctaves(p["midi"].int, fourString, 24))
        }
        for (row in f["judge"].array) {
            assertEquals(row[2].str, judge(FindNoteQuestion(row[0].int, "A"), row[1].int).id)
        }
    }

    @Test
    fun intervalsShapesAndQuestionSequences() {
        assertEquals(f["intervals"].array.map { it["id"].str }, INTERVAL_IDS)
        for (i in f["intervals"].array) {
            assertEquals(i["semitones"].int, semitonesOf(i["id"].str))
            assertEquals(i["lows"].ints(), lowNotesFor(i["id"].str, fourString, 24))
            assertEquals(i["lowsFive"].ints(), lowNotesFor(i["id"].str, getTuning("5-standard")!!, 20))
        }
        f["levels"].array.forEachIndexed { i, level -> assertEquals(level.strings(), intervalsFor(i + 1)) }
        for (s in f["shapes"].array) {
            val shape = shapeOf(s["low"].int, s["high"].int, fourString, 12)
            val expected = s["shape"].takeUnless { it.isNull }
            assertEquals(
                expected?.let {
                    position(it["low"]) to position(it["high"])
                },
                shape?.let { it.low to it.high },
            )
        }
        for (n in f["near"].array) {
            val expected = n["near"].takeUnless { it.isNull }?.let(::position)
            assertEquals(expected, positionNear(n["midi"].int, position(n["from"]), fourString, 12))
        }
        for (run in f["intervalRuns"].array) {
            val play = PlayMode.entries.first { it.id == run["play"].str }
            val level = run["level"].int
            val options = IntervalOptions(getTuning(run["tuning"].str)!!, 24, level, play)
            val random = createRandom(level * 10L + play.id.length)
            var q = nextIntervalQuestion(options, random, stats)
            val asked = mutableListOf(q)
            repeat(25) { asked += nextIntervalQuestion(options, random, stats, q).also { q = it } }
            assertEquals(
                run["asked"].array.map { Triple(it["interval"].str, it["low"].int, it["direction"].str) },
                asked.map { Triple(it.interval, it.low, it.direction.id) },
                "${run["tuning"].str} level $level ${play.id}",
            )
        }
    }
}

private fun JsonElement.jsonObjectEntries() = (this as kotlinx.serialization.json.JsonObject).entries.map {
    it.key to
        it.value
}
