package com.perceptronics.musicteacher.features

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.perceptronics.musicteacher.audio.BassAudio
import com.perceptronics.musicteacher.audio.BassEngine
import com.perceptronics.musicteacher.audio.SequenceOptions
import com.perceptronics.musicteacher.core.theory.Direction
import com.perceptronics.musicteacher.core.theory.buildPlaySequence
import com.perceptronics.musicteacher.core.theory.formatNote
import com.perceptronics.musicteacher.core.theory.getFretboardNotes
import com.perceptronics.musicteacher.core.theory.getTuning
import com.perceptronics.musicteacher.core.theory.noteMidi
import com.perceptronics.musicteacher.core.theory.resolveScale
import com.perceptronics.musicteacher.i18n.LocalLocale
import com.perceptronics.musicteacher.i18n.t
import kotlinx.coroutines.delay

/** Web metronome clicks (CLICKS in src/audio/MetronomeEngine.ts): accent, then normal beats. */
private const val ACCENT_HZ = 1760.0
private const val NORMAL_HZ = 1175.0

/**
 * Phase 3's test bench (docs/ANDROID.md): plays the recorded bass, a scale in time and
 * metronome clicks through the new audio engine, and shows the output latency. The Scales
 * screen replaces it in phase 4.
 */
@Composable
fun SoundCheck(modifier: Modifier = Modifier) {
    val locale = LocalLocale.current
    val tuning = remember { getTuning("4-standard")!! }
    val scale = remember {
        buildPlaySequence(getFretboardNotes(tuning, 24, resolveScale("A", "major")), Direction.UP_DOWN)
    }
    var playing by remember { mutableStateOf<Int?>(null) }
    var latencyMs by remember { mutableStateOf<Long?>(null) }

    LaunchedEffect(Unit) {
        while (true) {
            val rate = BassAudio.sampleRate()
            latencyMs = if (rate > 0) BassAudio.latencyFrames() * 1000 / rate else null
            delay(1000)
        }
    }
    DisposableEffect(Unit) { onDispose { BassEngine.stop() } }

    Card(modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(t("android.soundCheck.title"), style = MaterialTheme.typography.titleLarge)
            Text(
                t("android.soundCheck.description"),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            Text(t("android.soundCheck.strings"), style = MaterialTheme.typography.labelLarge)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                tuning.strings.forEach { note ->
                    FilledTonalButton(onClick = { BassEngine.playNote(noteMidi(note)) }) {
                        Text(formatNote(note, locale))
                    }
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                if (playing == null) {
                    Button(onClick = {
                        BassEngine.playSequence(
                            scale.map {
                                it.midi
                            },
                            SequenceOptions(100, loop = false) { playing = it },
                        )
                    }) { Text(t("android.soundCheck.playScale")) }
                } else {
                    Button(onClick = { BassEngine.stop() }) { Text(t("android.soundCheck.stop")) }
                }
                Text(
                    playing?.let { formatNote(scale[it].name, locale) } ?: "",
                    style = MaterialTheme.typography.headlineMedium,
                    color = MaterialTheme.colorScheme.secondary,
                    modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
                )
            }

            OutlinedButton(onClick = {
                // One bar of 4/4 at 120 BPM, accent on one.
                repeat(4) { beat ->
                    BassAudio.click(if (beat == 0) ACCENT_HZ else NORMAL_HZ, if (beat == 0) 1f else 0.75f, beat * 0.5)
                }
            }) { Text(t("android.soundCheck.clicks")) }

            latencyMs?.let {
                Text(
                    t("android.soundCheck.latency", "ms" to it, "rate" to BassAudio.sampleRate()),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}
