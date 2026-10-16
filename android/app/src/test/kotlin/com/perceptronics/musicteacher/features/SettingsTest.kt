package com.perceptronics.musicteacher.features

import com.perceptronics.musicteacher.core.theory.Direction
import com.perceptronics.musicteacher.features.arpeggios.ArpeggioSettings
import com.perceptronics.musicteacher.features.neck.LabelMode
import com.perceptronics.musicteacher.features.neck.NeckSettings
import com.perceptronics.musicteacher.features.neck.Params
import com.perceptronics.musicteacher.features.neck.PlaybackSettings
import com.perceptronics.musicteacher.features.scales.ScaleSettings
import kotlin.test.Test
import kotlin.test.assertEquals

// Ports of src/features/scales/scaleState.test.ts and src/features/arpeggios/arpeggioState.test.ts.

private val NECK = NeckSettings(tuning = "5-standard", frets = 21, labels = LabelMode.INTERVAL, leftHanded = true)
private val PLAYBACK = PlaybackSettings(bpm = 120, direction = Direction.UP_DOWN, loop = true)

class SettingsTest {
    @Test
    fun scaleSettingsRoundTrip() {
        val settings = ScaleSettings("F#", "dorian", NECK, PLAYBACK)
        assertEquals(settings, ScaleSettings.fromParams(Params.parse(settings.toParams().toString())))
    }

    @Test
    fun scaleSettingsFallBackToDefaults() {
        val params = Params.parse("key=H&scale=bebop&tuning=7-string&frets=30&bpm=999&dir=sideways")
        assertEquals(ScaleSettings(), ScaleSettings.fromParams(params))
    }

    @Test
    fun arpeggioSettingsRoundTrip() {
        val settings = ArpeggioSettings("Bb", "m7b5", 2, NECK, PLAYBACK)
        assertEquals(settings, ArpeggioSettings.fromParams(Params.parse(settings.toParams().toString())))
    }

    @Test
    fun arpeggioDefaultsKeepTheStringShort() {
        assertEquals("key=C&chord=maj", ArpeggioSettings().toParams().toString())
    }

    @Test
    fun arpeggioSettingsFallBackToDefaults() {
        val params = Params.parse("key=H&chord=add9&oct=3&tuning=7-string&bpm=999")
        assertEquals(ArpeggioSettings(), ArpeggioSettings.fromParams(params))
    }

    @Test
    fun paramsEncodeLikeTheWeb() {
        // URLSearchParams writes "key=F%23&dir=upDown" for the same settings.
        val params = ScaleSettings(key = "F#", playback = PlaybackSettings(direction = Direction.UP_DOWN)).toParams()
        assertEquals("key=F%23&scale=major&dir=upDown", params.toString())
        assertEquals("F#", Params.parse("?key=F%23&key=C")["key"])
    }
}
