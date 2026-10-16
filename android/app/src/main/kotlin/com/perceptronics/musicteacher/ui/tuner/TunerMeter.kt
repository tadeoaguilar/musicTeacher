package com.perceptronics.musicteacher.ui.tuner

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.perceptronics.musicteacher.core.pitch.IN_TUNE_CENTS
import com.perceptronics.musicteacher.core.theory.formatNote
import com.perceptronics.musicteacher.core.theory.parseNote
import com.perceptronics.musicteacher.i18n.LocalLocale
import com.perceptronics.musicteacher.i18n.t
import com.perceptronics.musicteacher.ui.theme.LocalNeckColors
import java.util.Locale
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.roundToInt
import kotlin.math.sin

// Port of src/components/Tuner/TunerMeter.tsx: the same 320×186 gauge, in its units.

private const val CX = 160f
private const val CY = 170f
private const val RADIUS = 140f

/** ±50 cents spans ±60° of arc. */
private const val DEGREES_PER_CENT = 60f / 50f

/** The note being heard, spelled with an octave ("A1"). */
data class HeardNote(val name: String, val cents: Double, val hz: Double)

/** A needle gauge from 50 cents flat to 50 cents sharp, with the note's name below it. */
@Composable
fun TunerMeter(note: HeardNote?, listening: Boolean, modifier: Modifier = Modifier) {
    val locale = LocalLocale.current
    val neck = LocalNeckColors.current
    val scheme = MaterialTheme.colorScheme
    val cents = note?.cents?.roundToInt() ?: 0
    val inTune = note != null && abs(note.cents) <= IN_TUNE_CENTS
    val color = if (inTune) neck.inTune else scheme.primary
    val octave = note?.let { parseNote(it.name)?.octave }
    val display = note?.let { formatNote(it.name, locale) } ?: "—"
    val status = when {
        note == null -> t(if (listening) "tuner.listening" else "tuner.idle")
        inTune -> t("tuner.inTune")
        else -> t(if (cents < 0) "tuner.flat" else "tuner.sharp", "cents" to abs(cents))
    }
    val angle by animateFloatAsState(cents * DEGREES_PER_CENT, tween(120), label = "needle")
    val measurer = rememberTextMeasurer()
    val muted = scheme.onSurfaceVariant
    val text = scheme.onSurface

    Column(
        modifier
            .fillMaxWidth()
            .clearAndSetSemantics {
                contentDescription = if (note != null) "$display${octave ?: ""}, $status" else status
                liveRegion = LiveRegionMode.Polite
            },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Canvas(Modifier.widthIn(max = 360.dp).fillMaxWidth().aspectRatio(320f / 186f)) {
            val u = size.width / 320f
            fun polar(c: Float, r: Float): Offset {
                val a = Math.toRadians((c * DEGREES_PER_CENT).toDouble())
                return Offset((CX + r * sin(a)).toFloat() * u, (CY - r * cos(a)).toFloat() * u)
            }
            // The arc around 0 cents that counts as in tune.
            val zone = IN_TUNE_CENTS * DEGREES_PER_CENT
            drawArc(
                neck.inTune.copy(alpha = 0.35f),
                startAngle = -90 - zone,
                sweepAngle = 2 * zone,
                useCenter = false,
                topLeft = Offset((CX - RADIUS) * u, (CY - RADIUS) * u),
                size = Size(2 * RADIUS * u, 2 * RADIUS * u),
                style = Stroke(14 * u),
            )
            for (i in 0..10) {
                val c = -50f + i * 10
                val center = c == 0f
                drawLine(
                    if (center) text else muted,
                    polar(c, RADIUS - if (center) 22 else 12),
                    polar(c, RADIUS + 6),
                    (if (center) 3 else 2) * u,
                    StrokeCap.Round,
                )
            }
            val labelStyle =
                TextStyle(color = muted, fontSize = (22 * u / density / fontScale).sp, fontWeight = FontWeight.Bold)
            for ((sign, c) in listOf("♭" to -50f, "♯" to 50f)) {
                val layout = measurer.measure(sign, labelStyle)
                val x = polar(c, RADIUS + 20).x
                drawText(layout, topLeft = Offset(x - layout.size.width / 2f, 70 * u - layout.firstBaseline))
            }
            rotate(angle, pivot = Offset(CX * u, CY * u)) {
                drawLine(
                    color.copy(alpha = if (note == null) 0.25f else 1f),
                    Offset(CX * u, CY * u),
                    Offset(CX * u, (CY - RADIUS + 8) * u),
                    4 * u,
                    StrokeCap.Round,
                )
            }
            drawCircle(color, 7 * u, Offset(CX * u, CY * u))
        }

        Column(Modifier.heightIn(min = 132.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Row(verticalAlignment = Alignment.Bottom) {
                Text(display, color = color, fontSize = 72.sp, fontWeight = FontWeight.ExtraBold, lineHeight = 72.sp)
                if (octave != null) {
                    Text(
                        octave.toString(),
                        color = muted,
                        fontSize = 29.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(start = 2.dp, bottom = 6.dp),
                    )
                }
            }
            Text(
                status,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = if (inTune) neck.inTune else text,
            )
            Text(
                note?.let { String.format(Locale.ROOT, "%.1f Hz", it.hz) } ?: " ",
                style = MaterialTheme.typography.bodySmall,
                color = muted,
            )
        }
    }
}
