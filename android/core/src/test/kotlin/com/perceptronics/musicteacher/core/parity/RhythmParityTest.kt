package com.perceptronics.musicteacher.core.parity

import com.perceptronics.musicteacher.core.rhythm.Accent
import com.perceptronics.musicteacher.core.rhythm.BarSettings
import com.perceptronics.musicteacher.core.rhythm.GapTrainer
import com.perceptronics.musicteacher.core.rhythm.METER_IDS
import com.perceptronics.musicteacher.core.rhythm.PATTERNS
import com.perceptronics.musicteacher.core.rhythm.SpeedTrainer
import com.perceptronics.musicteacher.core.rhythm.TrainerSettings
import com.perceptronics.musicteacher.core.rhythm.barPlan
import com.perceptronics.musicteacher.core.rhythm.buildBar
import com.perceptronics.musicteacher.core.rhythm.canSwing
import com.perceptronics.musicteacher.core.rhythm.cycleAccent
import com.perceptronics.musicteacher.core.rhythm.eventStarts
import com.perceptronics.musicteacher.core.rhythm.findPattern
import com.perceptronics.musicteacher.core.rhythm.getMeter
import com.perceptronics.musicteacher.core.rhythm.layoutRhythm
import com.perceptronics.musicteacher.core.rhythm.patternsFor
import com.perceptronics.musicteacher.core.rhythm.subdivisionPattern
import com.perceptronics.musicteacher.core.rhythm.subdivisionsFor
import com.perceptronics.musicteacher.core.rhythm.swingPosition
import com.perceptronics.musicteacher.core.rhythm.tapTempo
import com.perceptronics.musicteacher.core.rhythm.validatePattern
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlinx.serialization.json.JsonElement

/** src/rhythm against the web app's results (fixtures/rhythm.json). */
class RhythmParityTest {
    private val f = Fixtures.load("rhythm")

    private fun events(e: JsonElement) = e["events"].array.map {
        it["ticks"].int to
            (it.opt("rest").takeUnless { r -> r.isNull }?.bool ?: false)
    }

    @Test
    fun metersAndPatterns() {
        assertEquals(f["meters"].array.map { it["id"].str }, METER_IDS)
        for (m in f["meters"].array) {
            val meter = getMeter(m["id"].str)
            assertEquals(
                listOf(m["beats"].int, m["beatTicks"].int, m["barTicks"].int),
                listOf(meter.beats, meter.beatTicks, meter.barTicks),
            )
            assertEquals(m["compound"].bool, meter.compound)
            assertEquals(m["subdivisions"].ints(), subdivisionsFor(meter))
            assertEquals(m["swingable"].ints(), subdivisionsFor(meter).filter { canSwing(meter, it) })
        }
        assertEquals(f["patterns"].array.size, PATTERNS.size)
        f["patterns"].array.zip(PATTERNS).forEach { (p, pattern) ->
            assertEquals(p["id"].str, pattern.id)
            assertEquals(p["group"].str, pattern.group.name.lowercase())
            assertEquals(p["meters"].strings(), pattern.meters)
            assertEquals(events(p), pattern.events.map { it.ticks to it.rest })
            assertEquals(p["starts"].ints(), eventStarts(pattern.events))
        }
        for (s in f["subdivisionPatterns"].array) {
            val pattern = subdivisionPattern(s["meter"].str, s["sub"].int)
            assertEquals(s["pattern"]["id"].str, pattern.id)
            assertEquals(events(s["pattern"]), pattern.events.map { it.ticks to it.rest })
        }
        for (row in f["cycleAccent"].array) assertEquals(row[1].str, cycleAccent(Accent.valueOf(row[0].str)).name)
        for (row in f["swing"].array) {
            assertClose(
                row[3].double,
                swingPosition(row[0].double, row[1].double, row[2].double),
            )
        }
    }

    @Test
    fun everyBarInEveryMeterSubdivisionSwingAndPattern() {
        for (b in f["bars"].array) {
            val meter = b["meter"].str
            val settings = BarSettings(
                meter,
                b["sub"].int,
                b["swing"].double,
                b["accents"].strings().map(Accent::valueOf),
                b["pattern"].takeUnless { it.isNull }?.let { findPattern(meter, it.str) },
            )
            val label = with(settings) { "$meter sub $sub swing $swing $accents ${b["pattern"]}" }
            val actual = buildBar(settings)
            assertEquals(b["events"].array.size, actual.size, label)
            b["events"].array.zip(actual).forEach { (e, event) ->
                assertEquals(e[0].str, event.kind.id, label)
                assertClose(e[1].double, event.at, label)
                assertEquals(e[2].int, event.beat, label)
                if (e.array.size > 3) {
                    assertClose(e[3].double, event.duration!!, label)
                    assertEquals(e[4].int, event.index, label)
                }
            }
        }
    }

    @Test
    fun notationLayoutsAndValidation() {
        for (l in f["layouts"].array) {
            val meter = l["meter"].str
            val id = l["pattern"].str
            val pattern = (
                patternsFor(meter) + subdivisionsFor(getMeter(meter)).map {
                    subdivisionPattern(meter, it)
                }
                ).first {
                it.id ==
                    id
            }
            val layout = layoutRhythm(pattern, meter)
            val expected = l["layout"]
            val label = "$meter $id"
            assertEquals(l["errors"].strings(), validatePattern(pattern, meter), label)
            assertEquals(
                expected["glyphs"].array.map {
                    listOf(
                        it["index"].int,
                        it["start"].int,
                        it["ticks"].int,
                        it["rest"].bool,
                        it["value"].str,
                        it["dotted"].bool,
                        it["triplet"].bool,
                        it["flagged"].bool,
                    )
                },
                layout.glyphs.map {
                    listOf(it.index, it.start, it.ticks, it.rest, it.value.id, it.dotted, it.triplet, it.flagged)
                },
                label,
            )
            assertEquals(
                expected["beams"].array.map { b ->
                    Triple(
                        b["notes"].ints(),
                        b["secondary"].array.map {
                            it[0].int to it[1].int
                        },
                        b["stubs"].array.map {
                            it["index"].int to
                                it["dir"].int
                        },
                    )
                },
                layout.beams.map { b -> Triple(b.notes, b.secondary, b.stubs.map { it.index to it.dir }) },
                label,
            )
            assertEquals(
                expected["tuplets"].array.map { listOf(it["first"].int, it["last"].int, it["count"].int) },
                layout.tuplets.map { listOf(it.first, it.last, it.count) },
                label,
            )
            assertEquals(
                listOf(expected["barTicks"].int, expected["beatTicks"].int),
                listOf(layout.barTicks, layout.beatTicks),
            )
        }
    }

    @Test
    fun trainerPlansAndTapTempo() {
        for (p in f["plans"].array) {
            val s = p["settings"]
            val speed = s.opt("speed").takeUnless {
                it.isNull
            }?.let { SpeedTrainer(it["target"].int, it["step"].int, it["every"].int) }
            val gap = s.opt("gap").takeUnless { it.isNull }?.let { GapTrainer(it["play"].int, it["mute"].int) }
            val settings = TrainerSettings(s["bpm"].int, s["countIn"].bool, speed, gap)
            p["plans"].array.forEachIndexed { i, plan ->
                val actual = barPlan(i, settings)
                assertEquals(
                    listOf(
                        plan["bpm"].int,
                        plan["muted"].bool,
                        plan["countIn"].bool,
                        plan.opt("barsToNextStep").intOrNull(),
                    ),
                    listOf(actual.bpm, actual.muted, actual.countIn, actual.barsToNextStep),
                    "$settings bar $i",
                )
            }
        }
        var taps = emptyList<Long>()
        for (row in f["taps"].array) {
            val state = tapTempo(taps, row[0].long)
            taps = state.taps
            assertEquals(row[1].array.map { it.long }, state.taps)
            assertEquals(row[2].intOrNull(), state.bpm)
        }
    }
}
