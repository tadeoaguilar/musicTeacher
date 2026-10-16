package com.perceptronics.musicteacher.ui.controls

import androidx.compose.runtime.Composable
import com.perceptronics.musicteacher.core.theory.FRET_COUNTS
import com.perceptronics.musicteacher.core.theory.KEY_IDS
import com.perceptronics.musicteacher.core.theory.STRING_COUNTS
import com.perceptronics.musicteacher.core.theory.defaultTuningFor
import com.perceptronics.musicteacher.core.theory.formatNote
import com.perceptronics.musicteacher.core.theory.getTuning
import com.perceptronics.musicteacher.core.theory.keySpellings
import com.perceptronics.musicteacher.core.theory.tuningsFor
import com.perceptronics.musicteacher.features.neck.LabelMode
import com.perceptronics.musicteacher.features.neck.NeckSettings
import com.perceptronics.musicteacher.i18n.LocalLocale
import com.perceptronics.musicteacher.i18n.t

// Port of src/components/Controls/NeckFields.tsx and TuningFields.tsx.

/** The 12 keys, each showing its enharmonic spellings (C♯/D♭). */
@Composable
fun KeyField(value: String, onChange: (String) -> Unit) {
    val locale = LocalLocale.current
    Chips(
        t("controls.key"),
        value,
        KEY_IDS.map { key -> Option(key, keySpellings(key).joinToString("/") { formatNote(it, locale) }) },
        onChange,
    )
}

/** String count and tuning pickers, shared by every section that knows about the bass's strings. */
@Composable
fun TuningFields(tuning: String, onChange: (String) -> Unit) {
    val locale = LocalLocale.current
    val stringCount = getTuning(tuning)!!.strings.size
    Segmented(t("controls.strings"), stringCount, STRING_COUNTS.map { Option(it, it.toString()) }) {
        onChange(defaultTuningFor(it).id)
    }
    Dropdown(
        t("controls.tuning"),
        tuning,
        tuningsFor(stringCount).map { tu ->
            Option(
                tu.id,
                "${t("controls.tunings.${tu.nameKey}")} (${tu.strings.joinToString(" ") {
                    formatNote(it, locale)
                }})",
            )
        },
        onChange,
    )
}

/** Strings, tuning, frets, labels and handedness: how the fretboard is drawn. */
@Composable
fun NeckFields(settings: NeckSettings, onChange: (NeckSettings) -> Unit) {
    TuningFields(settings.tuning) { onChange(settings.copy(tuning = it)) }
    Segmented(t("controls.frets"), settings.frets, FRET_COUNTS.map { Option(it, it.toString()) }) {
        onChange(settings.copy(frets = it))
    }
    Segmented(
        t("controls.labels"),
        settings.labels,
        listOf(
            Option(LabelMode.NOTE, t("controls.labelNote")),
            Option(LabelMode.INTERVAL, t("controls.labelInterval")),
        ),
    ) { onChange(settings.copy(labels = it)) }
    Toggle(t("controls.leftHanded"), settings.leftHanded) { onChange(settings.copy(leftHanded = it)) }
}
