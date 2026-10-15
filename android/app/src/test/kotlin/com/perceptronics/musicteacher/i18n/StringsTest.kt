package com.perceptronics.musicteacher.i18n

import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals

class StringsTest {
    private val strings = Strings.parse(
        """
        {
          "app": { "nav": { "scales": "Scales" } },
          "ear": { "prompt": "Tap it (frets 0–{{max}})." },
          "metronome": { "nextStep_one": "next change in {{count}} bar", "nextStep_other": "next change in {{count}} bars" }
        }
        """,
    )

    @Test
    fun readsDottedKeys() = assertEquals("Scales", strings.t("app.nav.scales"))

    @Test
    fun interpolatesArguments() = assertEquals("Tap it (frets 0–5).", strings.t("ear.prompt", "max" to 5))

    @Test
    fun picksPluralsByCount() {
        assertEquals("next change in 1 bar", strings.t("metronome.nextStep", "count" to 1))
        assertEquals("next change in 4 bars", strings.t("metronome.nextStep", "count" to 4))
    }

    @Test
    fun showsTheKeyWhenMissing() = assertEquals("app.nope", strings.t("app.nope"))

    @Test
    fun readsTheWebAppsRealStrings() {
        val en = Strings.parse(File("../../src/i18n/en.json").readText())
        val es = Strings.parse(File("../../src/i18n/es.json").readText())
        assertEquals("Ear training", en.t("app.nav.ear"))
        assertEquals("Afinador", es.t("app.nav.tuner"))
    }
}
