package com.perceptronics.musicteacher.features

import com.perceptronics.musicteacher.features.neck.Params
import com.perceptronics.musicteacher.features.tuner.TunerSettings
import kotlin.test.Test
import kotlin.test.assertEquals

// Port of src/features/tuner/tunerState.test.ts.

class TunerSettingsTest {
    @Test
    fun roundTripsSettings() {
        val settings = TunerSettings(tuning = "5-drop-a", a4 = 432)
        assertEquals("tuning=5-drop-a&a4=432", settings.toParams().toString())
        assertEquals(settings, TunerSettings.fromParams(Params.parse(settings.toParams().toString())))
    }

    @Test
    fun ignoresInvalidValues() {
        assertEquals(TunerSettings(), TunerSettings.fromParams(Params.parse("tuning=7-string&a4=500")))
        assertEquals(TunerSettings(), TunerSettings.fromParams(Params.parse("a4=440.5")))
    }

    @Test
    fun keepsDefaultsOutOfTheString() {
        assertEquals("", TunerSettings().toParams().toString())
    }
}
