package com.perceptronics.musicteacher.ui.controls

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.dp
import com.perceptronics.musicteacher.R
import com.perceptronics.musicteacher.core.theory.Direction
import com.perceptronics.musicteacher.features.neck.BPM_MAX
import com.perceptronics.musicteacher.features.neck.BPM_MIN
import com.perceptronics.musicteacher.features.neck.PlaybackSettings
import com.perceptronics.musicteacher.i18n.t
import kotlin.math.roundToInt

/** Play/stop, tempo, direction and loop (port of src/components/Controls/Transport.tsx). */
@Composable
fun Transport(
    isPlaying: Boolean,
    settings: PlaybackSettings,
    playLabel: String,
    onPlay: () -> Unit,
    onStop: () -> Unit,
    onChange: (PlaybackSettings) -> Unit,
) {
    Panel {
        Button(
            onClick = if (isPlaying) onStop else onPlay,
            modifier = Modifier.fillMaxWidth(),
            colors = if (isPlaying) {
                ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.secondary,
                )
            } else {
                ButtonDefaults.buttonColors()
            },
            contentPadding = ButtonDefaults.ButtonWithIconContentPadding,
        ) {
            Icon(painterResource(if (isPlaying) R.drawable.ic_stop else R.drawable.ic_play), contentDescription = null)
            Text(if (isPlaying) t("player.stop") else playLabel, Modifier.padding(start = 8.dp))
        }

        val tempo = t("player.tempo")
        val bpm = t("player.bpm", "bpm" to settings.bpm)
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                "$tempo · $bpm",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Slider(
                value = settings.bpm.toFloat(),
                onValueChange = { onChange(settings.copy(bpm = it.roundToInt())) },
                valueRange = BPM_MIN.toFloat()..BPM_MAX.toFloat(),
                modifier = Modifier.semantics {
                    contentDescription = tempo
                    stateDescription = bpm
                },
            )
        }

        Segmented(
            t("player.direction"),
            settings.direction,
            Direction.entries.map { Option(it, t("player.${it.id}")) },
        ) { onChange(settings.copy(direction = it)) }
        Toggle(t("player.loop"), settings.loop) { onChange(settings.copy(loop = it)) }
        Text(
            t("player.hint"),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
