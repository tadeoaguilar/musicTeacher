package com.perceptronics.musicteacher.ui.tuner

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.ProgressBarRangeInfo
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.progressBarRangeInfo
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.perceptronics.musicteacher.i18n.t
import kotlin.math.log10
import kotlin.math.roundToInt

/** The bar spans −70 dBFS (a quiet room) to −10 dBFS (a hard pluck close to the mic). */
private const val FLOOR_DB = -70.0
private const val RANGE_DB = 60.0

/** Shows how loud the microphone hears the bass, so a weak signal is easy to spot (port of InputLevel.tsx). */
@Composable
fun InputLevel(
    /** RMS level, 0–1. */
    level: Double,
) {
    val db = 20 * log10(maxOf(level, 1e-6))
    val percent = (((db - FLOOR_DB) / RANGE_DB) * 100).coerceIn(0.0, 100.0).roundToInt()
    val label = t("tuner.level")
    Column(Modifier.widthIn(max = 320.dp).fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(
                Modifier
                    .weight(1f)
                    .height(8.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant)
                    .semantics {
                        contentDescription = label
                        progressBarRangeInfo = ProgressBarRangeInfo(percent.toFloat(), 0f..100f)
                    },
            ) {
                Box(Modifier.fillMaxHeight().fillMaxWidth(percent / 100f).background(MaterialTheme.colorScheme.primary))
            }
            Text(
                label,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Text(
            t("tuner.levelHint"),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
