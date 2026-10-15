package com.perceptronics.musicteacher.core.rhythm

import kotlin.math.round
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

// Port of src/rhythm/rhythm.test.ts.

private fun clicks(events: List<BarEvent>) =
    events.filter { it.kind != BarEventKind.BASS }.map { it.kind.id to round(it.at * 10000) / 10000 }

private val base = BarSettings("4/4", 1, 0.0, defaultAccents(4), null)

class RhythmTest {
    @Test
    fun countsDottedQuarterPulsesInCompoundMeters() {
        assertEquals(Meter("6/8", 2, true, 72, 144), getMeter("6/8"))
        assertEquals(4, getMeter("12/8").beats)
        assertEquals(144, getMeter("3/4").barTicks)
    }

    @Test
    fun clicksEveryBeatWithAnAccentOnOne() = assertEquals(
        listOf("accent" to 0.0, "normal" to 1.0, "normal" to 2.0, "normal" to 3.0),
        clicks(buildBar(base)),
    )

    @Test
    fun addsSubdivisionClicksAndSkipsSilentBeats() = assertEquals(
        listOf("accent" to 1.0, "sub" to 1.5, "accent" to 3.0, "sub" to 3.5),
        clicks(buildBar(base.copy(sub = 2, accents = listOf(Accent.S, Accent.A, Accent.S, Accent.A)))),
    )

    @Test
    fun placesTripletsAtThirdsOfTheBeat() {
        assertEquals(
            listOf(
                "accent" to 0.0,
                "sub" to 0.3333,
                "sub" to 0.6667,
                "normal" to 1.0,
                "sub" to 1.3333,
                "sub" to 1.6667,
            ),
            clicks(buildBar(base.copy(meter = "2/4", sub = 3, accents = defaultAccents(2)))),
        )
        assertEquals(6, buildBar(base.copy(meter = "6/8", sub = 3, accents = defaultAccents(2))).size)
    }

    @Test
    fun swingsOffBeatsUpToTripletTiming() {
        assertEquals(2.0 / 3, swingPosition(0.5, 0.5, 1.0), 1e-9)
        assertEquals(0.5 + 1.0 / 12, swingPosition(0.5, 0.5, 0.5), 1e-9)
        assertEquals(1.0, swingPosition(1.0, 0.5, 1.0))
        assertEquals(1.0 / 3, swingPosition(0.25, 0.25, 1.0), 1e-9)
        val subs = buildBar(base.copy(sub = 2, swing = 1.0)).filter { it.kind == BarEventKind.SUB }.map { it.at }
        listOf(2, 5, 8, 11).zip(subs).forEach { (x, at) -> assertEquals(x / 3.0, at, 1e-9) }
    }

    @Test
    fun doesNotSwingTriplets() =
        assertEquals(1.0 / 3, buildBar(base.copy(sub = 3, swing = 1.0)).first { it.kind == BarEventKind.SUB }.at, 1e-9)

    @Test
    fun playsThePatternOnTheBassSkippingRests() {
        val bass = buildBar(base.copy(pattern = findPattern("4/4", "motown"))).filter { it.kind == BarEventKind.BASS }
        assertEquals(listOf(0.0 to 1.5, 1.5 to 0.5, 2.0 to 1.0, 3.0 to 1.0), bass.map { it.at to it.duration })
        val tumbao = buildBar(base.copy(pattern = findPattern("4/4", "tumbao"))).filter { it.kind == BarEventKind.BASS }
        assertEquals(listOf(1.5, 3.0), tumbao.map { it.at })
    }

    @Test
    fun everyPatternFillsOneBarAndIsReadable() {
        for (p in PATTERNS) for (meter in p.meters) assertEquals(emptyList(), validatePattern(p, meter))
        for (meter in METER_IDS) {
            for (sub in subdivisionsFor(getMeter(meter))) {
                assertEquals(emptyList(), validatePattern(subdivisionPattern(meter, sub), meter))
            }
            val ids = patternsFor(meter).map { it.id }
            assertEquals(ids.size, ids.toSet().size)
        }
    }

    @Test
    fun beamsEighthsPerBeat() {
        assertEquals(
            listOf(listOf(0, 1), listOf(2, 3), listOf(4, 5), listOf(6, 7)),
            layoutRhythm(findPattern("4/4", "eighths")!!, "4/4").beams.map { it.notes },
        )
        assertEquals(
            listOf(3, 3),
            layoutRhythm(findPattern("6/8", "compoundEighths")!!, "6/8").beams.map {
                it.notes.size
            },
        )
    }

    @Test
    fun addsSixteenthBeamsStubsAndFlags() {
        val gallop = layoutRhythm(findPattern("4/4", "gallop")!!, "4/4")
        assertEquals(Beam(listOf(0, 1, 2), listOf(1 to 2), emptyList()), gallop.beams[0])
        val funk = layoutRhythm(findPattern("4/4", "funk")!!, "4/4")
        // A lone sixteenth after a rest is flagged rather than beamed.
        assertTrue(funk.glyphs[0].value == NoteValue.SIXTEENTH && funk.glyphs[0].flagged)
        assertTrue(funk.glyphs[1].value == NoteValue.EIGHTH && funk.glyphs[1].rest)
    }

    @Test
    fun readsDottedNotesAndBracketsTripletsPerBeat() {
        val motown = layoutRhythm(findPattern("4/4", "motown")!!, "4/4")
        assertTrue(motown.glyphs[0].value == NoteValue.QUARTER && motown.glyphs[0].dotted)
        assertTrue(motown.glyphs[1].value == NoteValue.EIGHTH && motown.glyphs[1].flagged)
        val triplets = layoutRhythm(findPattern("4/4", "triplets")!!, "4/4")
        assertEquals(4, triplets.tuplets.size)
        assertEquals(Tuplet(0, 2, 3), triplets.tuplets[0])
    }

    private val plain = TrainerSettings(60, countIn = false, speed = null, gap = null)

    @Test
    fun treatsBar0AsTheCountIn() {
        assertEquals(
            BarPlan(60, muted = false, countIn = true, barsToNextStep = null),
            barPlan(0, plain.copy(countIn = true)),
        )
        assertEquals(false, barPlan(1, plain.copy(countIn = true)).countIn)
    }

    @Test
    fun speedsUpEveryNBarsAndStopsAtTheTarget() {
        val speed = SpeedTrainer(70, 5, 4)
        assertEquals(
            listOf(60, 60, 60, 60, 65, 65, 65, 65, 70, 70, 70, 70, 70, 70),
            List(14) { barPlan(it, plain.copy(speed = speed)).bpm },
        )
        assertEquals(3, barPlan(5, plain.copy(speed = speed)).barsToNextStep)
        assertNull(barPlan(9, plain.copy(speed = speed)).barsToNextStep)
        assertEquals(50, barPlan(8, plain.copy(speed = SpeedTrainer(50, 3, 2))).bpm)
    }

    @Test
    fun mutesBarsInTheGapTrainerCountingAfterTheCountIn() = assertEquals(
        listOf(false, false, false, true, false, false, true),
        List(7) { barPlan(it, plain.copy(countIn = true, gap = GapTrainer(2, 1))).muted },
    )

    @Test
    fun averagesTapIntervals() {
        var state = tapTempo(emptyList(), 0)
        assertNull(state.bpm)
        for (t in listOf(500L, 1000L, 1500L)) state = tapTempo(state.taps, t)
        assertEquals(120, state.bpm)
    }

    @Test
    fun restartsAfterALongPauseAndKeepsOnlyRecentTaps() {
        assertEquals(TapResult(listOf(5000), null), tapTempo(listOf(0, 500), 5000))
        assertEquals(5, tapTempo(listOf(0, 1000, 2000, 3000, 4000), 4500).taps.size)
    }
}
