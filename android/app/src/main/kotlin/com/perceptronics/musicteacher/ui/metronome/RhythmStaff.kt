package com.perceptronics.musicteacher.ui.metronome

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import com.perceptronics.musicteacher.core.rhythm.Glyph
import com.perceptronics.musicteacher.core.rhythm.NoteValue
import com.perceptronics.musicteacher.core.rhythm.RhythmLayout
import com.perceptronics.musicteacher.ui.theme.LocalNeckColors

// Port of src/components/Metronome/RhythmStaff.tsx: the same 760×140 drawing, in its units.

private const val WIDTH = 760f
private const val HEIGHT = 140f
private const val LEFT = 64f
private const val RIGHT = 24f
private const val PAD = 18f
private const val LINE_Y = 84f
private const val STEM = 38f
private const val BEAM_Y = LINE_Y - STEM
private const val STEM_DX = 6.6f

/** Narrower than this and the notes get cramped, so the staff scrolls instead. */
private val MIN_WIDTH = 340.dp

/** Rhythm notation on a one-line percussion staff, spaced in proportion to time so it reads like it sounds. */
@Composable
fun RhythmStaff(
    layout: RhythmLayout,
    meter: String,
    /** Index of the note or rest sounding now. */
    active: Int?,
    label: String,
    modifier: Modifier = Modifier,
) {
    val text = MaterialTheme.colorScheme.onSurface
    val muted = MaterialTheme.colorScheme.onSurfaceVariant
    val highlight = LocalNeckColors.current.root
    val measurer = rememberTextMeasurer()
    val density = LocalDensity.current

    // Measured outside the scroll: inside it, the available width is unbounded.
    BoxWithConstraints(modifier.fillMaxWidth()) {
        val width = maxOf(maxWidth, MIN_WIDTH)
        val u = with(density) { width.toPx() } / WIDTH
        fun style(size: Float, weight: FontWeight, italic: Boolean = false) = TextStyle(
            fontSize = with(density) { (size * u).toSp() },
            fontWeight = weight,
            fontStyle = if (italic) FontStyle.Italic else FontStyle.Normal,
        )
        val (top, bottom) = meter.split('/')
        val beats = layout.barTicks / layout.beatTicks
        val texts = remember(meter, layout, u) {
            object {
                val top = measurer.measure(top, style(26f, FontWeight.ExtraBold))
                val bottom = measurer.measure(bottom, style(26f, FontWeight.ExtraBold))
                val counts = (1..beats).map { measurer.measure(it.toString(), style(13f, FontWeight.Bold)) }
                val tuplets = layout.tuplets.map {
                    measurer.measure(it.count.toString(), style(13f, FontWeight.Bold, italic = true))
                }
            }
        }

        Canvas(
            Modifier
                .horizontalScroll(rememberScrollState())
                .width(width)
                .aspectRatio(WIDTH / HEIGHT)
                .semantics { contentDescription = label },
        ) {
            val usable = WIDTH - LEFT - RIGHT - PAD * 2
            fun xOf(tick: Int) = LEFT + PAD + tick.toFloat() / layout.barTicks * usable
            fun stemX(i: Int) = xOf(layout.glyphs[i].start) + STEM_DX
            fun o(x: Float, y: Float) = Offset(x * u, y * u)

            // SVG text sits on its baseline at y, centered on x.
            fun DrawScope.label(t: androidx.compose.ui.text.TextLayoutResult, x: Float, y: Float, color: Color) =
                drawText(t, color, Offset(x * u - t.size.width / 2f, y * u - t.firstBaseline))

            drawLine(muted, o(10f, LINE_Y), o(WIDTH - 10, LINE_Y), 1.5f * u)
            drawLine(muted, o(WIDTH - 10, LINE_Y - 22), o(WIDTH - 10, LINE_Y + 22), 2.5f * u)
            label(texts.top, 32f, LINE_Y - 4, text)
            label(texts.bottom, 32f, LINE_Y + 24, text)
            texts.counts.forEachIndexed { b, t -> label(t, xOf(b * layout.beatTicks), 132f, muted) }

            for (g in layout.glyphs) {
                val x = xOf(g.start)
                val color = if (g.index == active) highlight else text
                if (g.rest) {
                    drawRest(g, x, u, color)
                    if (g.dotted) drawCircle(color, 2.4f * u, o(x + 12, LINE_Y - 6))
                    continue
                }
                val hollow = g.value == NoteValue.WHOLE || g.value == NoteValue.HALF
                rotate(-20f, pivot = o(x, LINE_Y)) {
                    val topLeft = o(x - 7.6f, LINE_Y - 5.4f)
                    val size = Size(15.2f * u, 10.8f * u)
                    if (hollow) {
                        drawOval(
                            color,
                            topLeft,
                            size,
                            style = Stroke(2.2f * u),
                        )
                    } else {
                        drawOval(color, topLeft, size)
                    }
                }
                if (g.value !=
                    NoteValue.WHOLE
                ) {
                    drawLine(color, o(x + STEM_DX, LINE_Y - 2), o(x + STEM_DX, BEAM_Y), 1.8f * u)
                }
                if (g.flagged) drawFlags(x + STEM_DX, if (g.value == NoteValue.SIXTEENTH) 2 else 1, u, color)
                if (g.dotted) drawCircle(color, 2.4f * u, o(x + 14, LINE_Y - 3))
            }

            // Beams are drawn in the text color, like the web (only note heads, stems and flags light up).
            for (beam in layout.beams) {
                val first = beam.notes.first()
                val last = beam.notes.last()
                fun bar(x: Float, y: Float, w: Float) = drawRect(text, o(x, y), Size(w * u, 5 * u))
                bar(stemX(first) - 0.8f, BEAM_Y, stemX(last) - stemX(first) + 1.6f)
                for ((a, b) in beam.secondary) bar(stemX(a) - 0.8f, BEAM_Y + 8, stemX(b) - stemX(a) + 1.6f)
                for (stub in beam.stubs) {
                    bar(
                        if (stub.dir ==
                            1
                        ) {
                            stemX(stub.index) - 0.8f
                        } else {
                            stemX(stub.index) - 10
                        },
                        BEAM_Y + 8,
                        10.8f,
                    )
                }
            }

            layout.tuplets.forEachIndexed { i, t ->
                val x1 = xOf(layout.glyphs[t.first].start)
                val x2 = xOf(layout.glyphs[t.last].start) + STEM_DX * 2
                val y = BEAM_Y - 12
                val bracket = Path().apply {
                    moveTo(x1 * u, (y + 6) * u)
                    lineTo(x1 * u, y * u)
                    lineTo(x2 * u, y * u)
                    lineTo(x2 * u, (y + 6) * u)
                }
                drawPath(bracket, muted, style = Stroke(1.4f * u))
                label(texts.tuplets[i], (x1 + x2) / 2, y - 3, muted)
            }
        }
    }
}

private fun DrawScope.drawRest(g: Glyph, x: Float, u: Float, color: Color) {
    val y = LINE_Y
    val stroke = Stroke(3 * u, cap = StrokeCap.Round, join = StrokeJoin.Round)
    fun o(px: Float, py: Float) = Offset(px * u, py * u)
    when (g.value) {
        NoteValue.WHOLE -> drawRect(color, o(x - 8, y), Size(16 * u, 7 * u))

        NoteValue.HALF -> drawRect(color, o(x - 8, y - 7), Size(16 * u, 7 * u))

        NoteValue.QUARTER -> {
            val path = Path().apply {
                moveTo((x - 3) * u, (y - 22) * u)
                lineTo((x + 4) * u, (y - 13) * u)
                lineTo((x - 3) * u, (y - 5) * u)
                lineTo((x + 4) * u, (y + 3) * u)
                quadraticTo((x - 7) * u, y * u, x * u, (y + 13) * u)
            }
            drawPath(path, color, style = stroke)
        }

        else -> {
            // Eighth rest: one hook; sixteenth rest: two.
            val hooks = if (g.value == NoteValue.SIXTEENTH) listOf(y - 12, y - 2) else listOf(y - 10)
            for (hy in hooks) {
                drawCircle(color, 3.2f * u, o(x - 3, hy))
                val hook = Path().apply {
                    moveTo((x - 3) * u, (hy + 1) * u)
                    quadraticTo((x + 1) * u, (hy + 3) * u, (x + 5) * u, (hy - 3) * u)
                }
                drawPath(hook, color, style = stroke)
            }
            drawLine(color, o(x + 5, hooks[0] - 3), o(x - 1, y + 14), 3 * u, StrokeCap.Round)
        }
    }
}

private fun DrawScope.drawFlags(x: Float, count: Int, u: Float, color: Color) {
    repeat(count) { i ->
        val y = BEAM_Y + i * 8
        val flag = Path().apply {
            moveTo(x * u, y * u)
            cubicTo((x + 2) * u, (y + 8) * u, (x + 13) * u, (y + 10) * u, (x + 9) * u, (y + 24) * u)
            cubicTo((x + 10) * u, (y + 14) * u, (x + 4) * u, (y + 11) * u, x * u, (y + 9) * u)
            close()
        }
        drawPath(flag, color)
    }
}
