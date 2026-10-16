package com.perceptronics.musicteacher.ui.metronome

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.unit.dp
import com.perceptronics.musicteacher.ui.theme.LocalNeckColors

/**
 * A classic metronome arm (port of src/components/Metronome/Pendulum.tsx, viewBox 200×150).
 * `angle` is read only while drawing, so the swing redraws this Canvas without recomposing.
 */
@Composable
fun Pendulum(angle: () -> Float, modifier: Modifier = Modifier) {
    val c = LocalNeckColors.current
    Canvas(modifier.width(180.dp).aspectRatio(200f / 150f)) {
        val u = size.width / 200f
        fun o(x: Float, y: Float) = Offset(x * u, y * u)
        val body = Path().apply {
            moveTo(70 * u, 140 * u)
            lineTo(130 * u, 140 * u)
            lineTo(112 * u, 20 * u)
            lineTo(88 * u, 20 * u)
            close()
        }
        drawPath(body, c.woodCenter)
        drawPath(body, c.woodEdge, style = Stroke(2 * u))
        // The scale: an arc of radius 85 from (60,128) to (140,128), dotted.
        val r = 85 * u
        val center = Offset(100 * u, (128 + kotlin.math.sqrt(85f * 85f - 40f * 40f)) * u)
        val sweep = Math.toDegrees(2 * kotlin.math.asin(40.0 / 85.0)).toFloat()
        drawArc(
            c.inlay,
            startAngle = 270 - sweep / 2,
            sweepAngle = sweep,
            useCenter = false,
            topLeft = center - Offset(r, r),
            size = Size(2 * r, 2 * r),
            style = Stroke(2 * u, pathEffect = PathEffect.dashPathEffect(floatArrayOf(2 * u, 6 * u))),
        )
        rotate(angle(), pivot = o(100f, 132f)) {
            drawLine(c.fretWire, o(100f, 132f), o(100f, 22f), 4 * u, StrokeCap.Round)
            drawRoundRect(c.root, o(90f, 52f), Size(20 * u, 16 * u), androidx.compose.ui.geometry.CornerRadius(3 * u))
        }
        drawCircle(c.nut, 5 * u, o(100f, 132f))
    }
}
