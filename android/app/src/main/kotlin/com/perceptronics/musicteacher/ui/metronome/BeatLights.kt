package com.perceptronics.musicteacher.ui.metronome

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.perceptronics.musicteacher.core.rhythm.Accent
import com.perceptronics.musicteacher.i18n.t
import com.perceptronics.musicteacher.ui.theme.LocalNeckColors

private val ACCENT_KEY = mapOf(Accent.A to "accent", Accent.N to "normal", Accent.S to "silent")

/**
 * One light per beat (tap to cycle accent → normal → silent) with small lights for
 * subdivisions (port of src/components/Metronome/BeatLights.tsx).
 */
@Composable
fun BeatLights(
    accents: List<Accent>,
    sub: Int,
    /** Beat and subdivision step sounding now, if running. */
    beat: Int?,
    step: Int?,
    countIn: Boolean,
    onCycle: (Int) -> Unit,
) {
    val neck = LocalNeckColors.current
    val scheme = MaterialTheme.colorScheme
    val controlHover = scheme.outline
    val cycleHint = t("metronome.cycleHint")
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterHorizontally),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        accents.forEachIndexed { i, accent ->
            val active = beat == i
            val on = active && step == 0
            val label = t(
                "metronome.beatLabel",
                "beat" to i + 1,
                "state" to t("metronome.${ACCENT_KEY.getValue(accent)}"),
            )
            val fill = when {
                !on -> scheme.surfaceVariant
                countIn -> neck.active
                accent == Accent.A -> neck.root
                accent == Accent.S -> controlHover
                else -> neck.note
            }
            val text = when {
                on && countIn -> neck.activeText
                on && accent != Accent.S -> Color.White
                else -> scheme.onSurface
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Box(
                    Modifier
                        .size(56.dp)
                        .scale(if (on) 1.12f else 1f)
                        .alpha(if (accent == Accent.S && !on) 0.4f else 1f)
                        .clip(CircleShape)
                        .background(fill)
                        .then(
                            when (accent) {
                                Accent.A -> Modifier.border(BorderStroke(3.dp, neck.root), CircleShape)
                                Accent.S -> Modifier.dashedCircle(scheme.onSurfaceVariant)
                                Accent.N -> Modifier
                            },
                        )
                        .clickable(role = Role.Button, onClickLabel = cycleHint) { onCycle(i) }
                        .semantics { contentDescription = label },
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        "${i + 1}",
                        color = text,
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.titleMedium,
                    )
                }
                if (sub > 1) {
                    Row(Modifier.padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                        repeat(sub) { k ->
                            Box(
                                Modifier.size(9.dp).clip(CircleShape).background(
                                    if (active &&
                                        step == k
                                    ) {
                                        scheme.primary
                                    } else {
                                        controlHover
                                    },
                                ),
                            )
                        }
                    }
                }
            }
        }
    }
}

/** The silent beat's dashed outline. */
private fun Modifier.dashedCircle(color: Color) = drawWithContent {
    drawContent()
    val w = 3.dp.toPx()
    drawCircle(
        color,
        radius = size.minDimension / 2 - w / 2,
        center = Offset(size.width / 2, size.height / 2),
        style = Stroke(w, pathEffect = PathEffect.dashPathEffect(floatArrayOf(6.dp.toPx(), 4.dp.toPx()))),
    )
}
