package com.perceptronics.musicteacher.features.scales

import android.content.Context
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewmodel.compose.viewModel
import com.perceptronics.musicteacher.audio.BassEngine
import com.perceptronics.musicteacher.core.theory.Direction
import com.perceptronics.musicteacher.core.theory.SCALE_IDS
import com.perceptronics.musicteacher.core.theory.buildPlaySequence
import com.perceptronics.musicteacher.core.theory.formatInterval
import com.perceptronics.musicteacher.core.theory.formatNote
import com.perceptronics.musicteacher.core.theory.getFretboardNotes
import com.perceptronics.musicteacher.core.theory.getTuning
import com.perceptronics.musicteacher.core.theory.positionKey
import com.perceptronics.musicteacher.core.theory.resolveScale
import com.perceptronics.musicteacher.features.neck.Player
import com.perceptronics.musicteacher.features.neck.SavedSettings
import com.perceptronics.musicteacher.i18n.LocalLocale
import com.perceptronics.musicteacher.i18n.t
import com.perceptronics.musicteacher.ui.controls.Dropdown
import com.perceptronics.musicteacher.ui.controls.KeyField
import com.perceptronics.musicteacher.ui.controls.NeckFields
import com.perceptronics.musicteacher.ui.controls.Option
import com.perceptronics.musicteacher.ui.controls.Panel
import com.perceptronics.musicteacher.ui.controls.Transport
import com.perceptronics.musicteacher.ui.fretboard.Fretboard
import com.perceptronics.musicteacher.ui.noteset.NeckLegend
import com.perceptronics.musicteacher.ui.noteset.NoteSetHeader

class ScalesViewModel(private val saved: SavedSettings) : ViewModel() {
    var settings by mutableStateOf(ScaleSettings.fromParams(saved.load("scales")))
        private set
    val player = Player()

    fun change(new: ScaleSettings) {
        val old = settings
        settings = new
        saved.save("scales", new.toParams())
        player.onSettingsChange(new != old.copy(playback = old.playback.copy(bpm = new.playback.bpm)), new.playback.bpm)
    }

    companion object {
        fun create(context: Context) = ScalesViewModel(SavedSettings(context.applicationContext))
    }
}

/** Port of src/features/scales/ScalesPage.tsx. */
@Composable
fun ScalesScreen() {
    val context = LocalContext.current
    val vm = viewModel { ScalesViewModel.create(context) }
    val locale = LocalLocale.current
    val s = vm.settings
    val tuning = getTuning(s.neck.tuning)!!

    val resolved = remember(s.key, s.scale) { resolveScale(s.key, s.scale) }
    val notes = remember(tuning, s.neck.frets, resolved) { getFretboardNotes(tuning, s.neck.frets, resolved) }
    val sequence = remember(notes, s.playback.direction, s.playback.loop) {
        buildPlaySequence(notes, s.playback.direction, s.playback.loop)
    }
    val path = remember(notes) { buildPlaySequence(notes, Direction.UP).map(::positionKey).toSet() }
    val active = vm.player.activeIndex?.let(sequence::getOrNull)?.let(::positionKey)

    DisposableEffect(Unit) { onDispose { vm.player.stop() } }

    val title =
        t("scales.heading", "key" to formatNote(resolved.tonic, locale), "scale" to t("scales.names.${s.scale}"))

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        NoteSetHeader(
            title,
            t("scales.descriptions.${s.scale}"),
            resolved.notes.map { formatNote(it, locale) },
            resolved.intervals.map(::formatInterval),
        )
        NeckLegend(t("scales.intro"), t("scales.legend.path"))

        Fretboard(
            tuning = tuning,
            fretCount = s.neck.frets,
            notes = notes,
            labels = s.neck.labels,
            leftHanded = s.neck.leftHanded,
            path = path,
            active = active,
            title = t("fretboard.label", "scale" to title, "strings" to tuning.strings.size),
            onPlay = { BassEngine.playNote(it) },
        )

        Transport(
            isPlaying = vm.player.isPlaying,
            settings = s.playback,
            playLabel = t("player.play"),
            onPlay = { vm.player.play(sequence.map { it.midi }, s.playback) },
            onStop = vm.player::stop,
            onChange = { vm.change(s.copy(playback = it)) },
        )

        Panel {
            KeyField(s.key) { vm.change(s.copy(key = it)) }
            Dropdown(t("controls.scale"), s.scale, SCALE_IDS.map { Option(it, t("scales.names.$it")) }) {
                vm.change(s.copy(scale = it))
            }
            NeckFields(s.neck) { vm.change(s.copy(neck = it)) }
        }
    }
}
