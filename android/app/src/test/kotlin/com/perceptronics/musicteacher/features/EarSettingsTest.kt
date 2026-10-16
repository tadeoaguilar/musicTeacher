package com.perceptronics.musicteacher.features

import com.perceptronics.musicteacher.core.ear.Counts
import com.perceptronics.musicteacher.core.ear.PlayMode
import com.perceptronics.musicteacher.features.ear.EarSettings
import com.perceptronics.musicteacher.features.ear.Exercise
import com.perceptronics.musicteacher.features.ear.ItemStatsStore
import com.perceptronics.musicteacher.features.neck.Params
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

// Port of src/features/ear/earState.test.ts, plus the stats storage format.

class EarSettingsTest {
    @Test
    fun roundTripsSettings() {
        val settings =
            EarSettings(
                Exercise.INTERVAL,
                3,
                "5-standard",
                21,
                leftHanded = true,
                showName = false,
                play = PlayMode.MIXED,
            )
        assertEquals(
            "ex=interval&level=3&name=0&play=mixed&tuning=5-standard&frets=21&lefty=1",
            settings.toParams().toString(),
        )
        assertEquals(settings, EarSettings.fromParams(Params.parse(settings.toParams().toString())))
    }

    @Test
    fun leavesDefaultsOut() {
        assertEquals("", EarSettings().toParams().toString())
    }

    @Test
    fun keepsOldFindTheNoteLinksWorking() {
        val s = EarSettings.fromParams(Params.parse("level=2"))
        assertEquals(Exercise.NOTE, s.exercise)
        assertEquals(2, s.level)
    }

    @Test
    fun fallsBackToDefaults() {
        assertEquals(
            EarSettings(),
            EarSettings.fromParams(Params.parse("ex=chords&level=9&play=sideways&tuning=7-string&frets=30")),
        )
    }

    @Test
    fun storesStatsAsTheWebsJson() {
        val stats = mapOf("C#" to Counts(3, 1), "P5" to Counts(0, 2))
        val json = ItemStatsStore.encode(stats)
        assertEquals("""{"C#":{"right":3,"wrong":1},"P5":{"right":0,"wrong":2}}""", json)
        assertEquals(stats, ItemStatsStore.decode(json))
        assertNull(ItemStatsStore.decode("not json"))
    }
}
