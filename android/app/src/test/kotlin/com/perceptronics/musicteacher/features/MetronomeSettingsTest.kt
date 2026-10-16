package com.perceptronics.musicteacher.features

import com.perceptronics.musicteacher.core.rhythm.Accent
import com.perceptronics.musicteacher.core.rhythm.GapTrainer
import com.perceptronics.musicteacher.core.rhythm.SpeedTrainer
import com.perceptronics.musicteacher.features.metronome.MetronomeSettings
import com.perceptronics.musicteacher.features.metronome.rootMidi
import com.perceptronics.musicteacher.features.neck.Params
import kotlin.test.Test
import kotlin.test.assertEquals

// Port of src/features/metronome/metronomeState.test.ts.

class MetronomeSettingsTest {
    private fun roundTrip(s: MetronomeSettings) = MetronomeSettings.fromParams(Params.parse(s.toParams().toString()))

    @Test
    fun roundTripsEverySetting() {
        val settings = MetronomeSettings(
            meter = "3/4",
            bpm = 132,
            sub = 4,
            swing = 60,
            accents = listOf(Accent.A, Accent.S, Accent.N),
            pattern = "waltz",
            root = "A",
            click = 50,
            bass = 90,
            countIn = true,
            speedOn = true,
            speed = SpeedTrainer(160, 4, 2),
            gapOn = true,
            gap = GapTrainer(3, 1),
        )
        assertEquals(settings, roundTrip(settings))
    }

    @Test
    fun keepsShortStringsForDefaults() {
        assertEquals("ts=4%2F4&bpm=80", MetronomeSettings.DEFAULT.toParams().toString())
    }

    @Test
    fun ignoresInvalidOrMismatchedValues() {
        val p = Params.parse("ts=6/8&bpm=999&sub=4&acc=ANNN&pat=motown&root=H&sp=abc&gap=0-2")
        assertEquals(MetronomeSettings.DEFAULT.withMeter("6/8"), MetronomeSettings.fromParams(p))
    }

    @Test
    fun withMeterResetsWhatTheNewMeterCannotUse() {
        val s = MetronomeSettings(sub = 4, pattern = "motown").withMeter("6/8")
        assertEquals(listOf(Accent.A, Accent.N), s.accents)
        assertEquals(1, s.sub)
        assertEquals("none", s.pattern)
        assertEquals(3, MetronomeSettings(sub = 3).withMeter("12/8").sub)
    }

    @Test
    fun bassRootsSitInTheLowRegister() {
        assertEquals(23, rootMidi("B"))
        assertEquals(28, rootMidi("E"))
        assertEquals(34, rootMidi("Bb"))
    }
}
