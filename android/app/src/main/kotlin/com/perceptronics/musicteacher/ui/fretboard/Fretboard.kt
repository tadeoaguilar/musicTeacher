package com.perceptronics.musicteacher.ui.fretboard

import android.provider.Settings
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.onClick
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import com.perceptronics.musicteacher.core.theory.FretNote
import com.perceptronics.musicteacher.core.theory.Position
import com.perceptronics.musicteacher.core.theory.Tuning
import com.perceptronics.musicteacher.core.theory.formatInterval
import com.perceptronics.musicteacher.core.theory.formatNote
import com.perceptronics.musicteacher.core.theory.openStringMidi
import com.perceptronics.musicteacher.core.theory.positionKey
import com.perceptronics.musicteacher.features.neck.LabelMode
import com.perceptronics.musicteacher.i18n.LocalLocale
import com.perceptronics.musicteacher.i18n.LocalStrings
import com.perceptronics.musicteacher.ui.theme.LocalNeckColors

/** One web SVG unit on screen: the neck scrolls sideways, at a size that's easy to tap. */
private val UNIT = 1.dp
private const val DOT_R = 15f
private const val HIT = 44f
private val SHADOW = Color.Black.copy(alpha = 0.35f)

/** What a quiz marker shows (FretMark in Fretboard.tsx). */
enum class MarkKind {
    /** The answer. */
    TARGET,

    /** The answer's note in another octave. */
    OCTAVE,

    /** A wrong tap. */
    WRONG,

    /** An interval's lower note. */
    ROOT,
}

/** A quiz marker, drawn after an answer; TalkBack reads `description`. */
data class FretMark(
    override val string: Int,
    override val fret: Int,
    val kind: MarkKind,
    val label: String,
    val description: String,
) : Position

/**
 * The bass neck with every note of a scale or chord (port of src/components/Fretboard).
 * Drawn on a Canvas; any fret can be tapped to hear it. Each note marker is also a
 * TalkBack button ("C, root, A string, fret 3").
 *
 * Quiz mode (`onFretTap`): a tap reports its string and fret instead of playing, and every
 * fret becomes a TalkBack button ("A string, fret 5"); `marks` draws the answers on top.
 */
@Composable
fun Fretboard(
    tuning: Tuning,
    fretCount: Int,
    notes: List<FretNote>,
    labels: LabelMode,
    leftHanded: Boolean,
    /** Positions ("string-fret") of the suggested fingering. */
    path: Set<String>,
    /** Position ("string-fret") of the note sounding right now. */
    active: String?,
    title: String,
    onPlay: (midi: Int) -> Unit,
    modifier: Modifier = Modifier,
    onFretTap: ((string: Int, fret: Int) -> Unit)? = null,
    marks: List<FretMark> = emptyList(),
) {
    val locale = LocalLocale.current
    val strings = LocalStrings.current
    val colors = LocalNeckColors.current
    val textColor = MaterialTheme.colorScheme.onSurface
    val mutedColor = MaterialTheme.colorScheme.onSurfaceVariant
    val density = LocalDensity.current
    val u = with(density) { UNIT.toPx() }
    val layout = remember(tuning.strings.size, fretCount, leftHanded) {
        FretboardLayout(tuning.strings.size, fretCount, leftHanded)
    }
    val openMidis = remember(tuning) { openStringMidi(tuning) }
    val play by rememberUpdatedState(onPlay)
    val fretTap by rememberUpdatedState(onFretTap)
    val tap = { s: Int, fret: Int -> fretTap?.invoke(s, fret) ?: play(openMidis[s] + fret) }

    // Text sizes follow the neck's scale, not the font-size setting, so labels fit their dots.
    val measurer = rememberTextMeasurer()
    fun style(size: Float, bold: Boolean = true) = TextStyle(
        fontSize = with(density) {
            (size * u).toSp()
        },
        fontWeight = if (bold) FontWeight.Bold else FontWeight.Normal,
    )
    val markerLabels = remember(notes, labels, locale, u) {
        notes.map {
            measurer.measure(
                if (labels ==
                    LabelMode.NOTE
                ) {
                    formatNote(it.name, locale)
                } else {
                    formatInterval(it.interval)
                },
                style(12f),
            )
        }
    }
    val stringLabels =
        remember(tuning, locale, u) { tuning.strings.map { measurer.measure(formatNote(it, locale), style(13f)) } }
    val fretNumbers = remember(fretCount, u) {
        (1..fretCount).map { fret ->
            val marked = fret in INLAY_FRETS || fret in DOUBLE_INLAY_FRETS
            measurer.measure(fret.toString(), style(11f, bold = marked)) to marked
        }
    }

    val markLabels = remember(marks, u) { marks.map { measurer.measure(it.label, style(12f)) } }

    val scroll = rememberScrollState()
    val padX = with(density) { 4.dp.toPx() }
    val start = notes.find { it.isStart }
    // Keep the starting note, then the note playing, in view; in a quiz, the answer.
    val firstMark = marks.firstOrNull()
    LaunchedEffect(layout, start?.let(::positionKey), active, firstMark) {
        val target: Position = notes.find { positionKey(it) == active } ?: start ?: firstMark ?: return@LaunchedEffect
        val cx = padX + layout.x(layout.noteX(target.fret)) * u
        val margin = 48 * u
        if (cx < scroll.value + margin || cx > scroll.value + scroll.viewportSize - margin) {
            scroll.animateScrollTo((cx - scroll.viewportSize / 2).toInt())
        }
    }

    val shape = RoundedCornerShape(12.dp)
    Box(
        modifier
            .fillMaxWidth()
            .clip(shape)
            .background(colors.neckBg)
            .border(1.dp, MaterialTheme.colorScheme.outline, shape)
            .semantics { contentDescription = title }
            .horizontalScroll(scroll)
            .padding(horizontal = 4.dp, vertical = 8.dp),
    ) {
        Box(Modifier.size(UNIT * layout.width, UNIT * layout.height)) {
            Canvas(
                Modifier
                    .matchParentSize()
                    .pointerInput(layout, openMidis) {
                        detectTapGestures { o ->
                            layout.hit(o.x / u, o.y / u)?.let { (s, fret) -> tap(s, fret) }
                        }
                    },
            ) {
                drawNeck(layout, u, colors.woodEdge, colors.woodCenter, colors.fretWire, colors.nut, colors.inlay)
                fretNumbers.forEachIndexed { i, (text, marked) ->
                    val fret = i + 1
                    val cx = layout.x((layout.fretWireX(fret - 1) + layout.fretWireX(fret)) / 2) * u
                    drawText(
                        text,
                        if (marked) textColor else mutedColor,
                        Offset(
                            cx - text.size.width / 2f,
                            (layout.neckBottom + 19) * u - text.firstBaseline,
                        ),
                    )
                }
                drawStrings(layout, u, colors.string)
                stringLabels.forEachIndexed { i, text ->
                    drawCentered(
                        text,
                        textColor,
                        layout.x(layout.stringLabelX) * u,
                        layout.stringY(i) * u,
                    )
                }

                notes.forEachIndexed { i, n ->
                    val key = positionKey(n)
                    val isActive = key == active
                    val center = Offset(layout.x(layout.noteX(n.fret)) * u, layout.stringY(n.string) * u)
                    val r = DOT_R * u * if (isActive) 1.3f else 1f
                    drawCircle(
                        when {
                            isActive -> colors.active
                            n.isRoot -> colors.root
                            else -> colors.note
                        },
                        r,
                        center,
                    )
                    if (key in path) {
                        drawCircle(colors.path, r, center, style = Stroke(2.5f * u))
                    } else {
                        drawCircle(SHADOW, r, center, style = Stroke(u))
                    }
                    drawCentered(
                        markerLabels[i],
                        if (isActive) colors.activeText else colors.noteText,
                        center.x,
                        center.y,
                    )
                }

                marks.forEachIndexed { i, m ->
                    val center = Offset(layout.x(layout.noteX(m.fret)) * u, layout.stringY(m.string) * u)
                    val r = DOT_R * u
                    if (m.kind == MarkKind.OCTAVE) {
                        drawCircle(colors.neckBg, r, center)
                        val dash = PathEffect.dashPathEffect(floatArrayOf(4 * u, 3 * u))
                        drawCircle(colors.inTune, r, center, style = Stroke(3 * u, pathEffect = dash))
                    } else {
                        val fill = when (m.kind) {
                            MarkKind.TARGET -> colors.inTune
                            MarkKind.WRONG -> colors.wrong
                            else -> colors.root
                        }
                        drawCircle(fill, r, center)
                        drawCircle(SHADOW, r, center, style = Stroke(u))
                    }
                    drawCentered(
                        markLabels[i],
                        if (m.kind ==
                            MarkKind.OCTAVE
                        ) {
                            textColor
                        } else {
                            colors.noteText
                        },
                        center.x,
                        center.y,
                    )
                }
            }

            if (start !=
                null
            ) {
                StartRing(
                    Offset(layout.x(layout.noteX(start.fret)), layout.stringY(start.string)),
                    colors.root,
                    Modifier.matchParentSize(),
                )
            }

            // Quiz mode, for TalkBack: every fret is a button that answers.
            if (onFretTap != null) {
                for (str in tuning.strings.indices) {
                    for (fret in 0..fretCount) {
                        val (a, b) = layout.cellEdges(fret).let { (a, b) -> layout.x(a) to layout.x(b) }
                        val label = strings.t(
                            "fretboard.cell",
                            "string" to formatNote(tuning.strings[str], locale),
                            "fret" to fret,
                        )
                        Box(
                            Modifier
                                .offset(UNIT * minOf(a, b), UNIT * (layout.stringY(str) - STRING_GAP / 2))
                                .size(UNIT * kotlin.math.abs(b - a), UNIT * STRING_GAP)
                                .semantics {
                                    contentDescription = label
                                    role = Role.Button
                                    onClick {
                                        tap(str, fret)
                                        true
                                    }
                                },
                        )
                    }
                }
            }
            marks.forEach { m ->
                Box(
                    Modifier
                        .offset(
                            UNIT * (layout.x(layout.noteX(m.fret)) - DOT_R),
                            UNIT * (layout.stringY(m.string) - DOT_R),
                        )
                        .size(UNIT * DOT_R * 2)
                        .semantics {
                            contentDescription = m.description
                            role = Role.Image
                        },
                )
            }

            // TalkBack: one button per note marker, over the drawing.
            notes.forEach { n ->
                val interval = if (n.isRoot) {
                    strings.t("fretboard.root")
                } else {
                    strings.t(
                        "fretboard.degree",
                        "degree" to n.interval,
                    )
                }
                val description = strings.t(
                    "fretboard.note",
                    "note" to formatNote(n.name, locale),
                    "interval" to interval,
                    "string" to formatNote(tuning.strings[n.string], locale),
                    "fret" to n.fret,
                ) + if (n.isStart) ", ${strings.t("fretboard.start")}" else ""
                Box(
                    Modifier
                        .offset(
                            UNIT * (layout.x(layout.noteX(n.fret)) - HIT / 2),
                            UNIT * (layout.stringY(n.string) - HIT / 2),
                        )
                        .size(UNIT * HIT)
                        .semantics {
                            contentDescription = description
                            role = Role.Button
                            onClick {
                                play(n.midi)
                                true
                            }
                        },
                )
            }
        }
    }
}

/** The pulsing ring around the starting note, on its own layer so only it redraws. */
@Composable
private fun StartRing(center: Offset, color: Color, modifier: Modifier) {
    val context = LocalContext.current
    val still =
        remember {
            Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) ==
                0f
        }
    val pulse = if (still) {
        null
    } else {
        rememberInfiniteTransition(
            label = "start",
        ).animateFloat(0f, 1f, infiniteRepeatable(tween(800), RepeatMode.Reverse), label = "pulse")
    }
    Canvas(modifier) {
        val p = pulse?.value ?: 0f
        val u = UNIT.toPx()
        drawCircle(color.copy(alpha = 1 - 0.6f * p), 21 * u * (0.95f + 0.2f * p), center * u, style = Stroke(2.5f * u))
    }
}

private fun DrawScope.drawCentered(text: TextLayoutResult, color: Color, cx: Float, cy: Float) {
    drawText(text, color, Offset(cx - text.size.width / 2f, cy - text.size.height / 2f))
}

/** Wood, inlay dots, fret wires and the nut (port of Neck.tsx). */
private fun DrawScope.drawNeck(
    l: FretboardLayout,
    u: Float,
    woodEdge: Color,
    woodCenter: Color,
    fretWire: Color,
    nut: Color,
    inlay: Color,
) {
    val neckEnd = l.fretWireX(l.fretCount)
    val left = minOf(l.x(l.nutX), l.x(neckEnd))
    val woodSize = Size(kotlin.math.abs(l.x(neckEnd) - l.x(l.nutX)) * u, (l.neckBottom - l.neckTop) * u)
    val wood = Brush.verticalGradient(listOf(woodEdge, woodCenter, woodEdge), l.neckTop * u, l.neckBottom * u)
    drawRoundRect(wood, Offset(left * u, l.neckTop * u), woodSize, CornerRadius(3 * u))
    drawRoundRect(woodEdge, Offset(left * u, l.neckTop * u), woodSize, CornerRadius(3 * u), Stroke(u))

    // Inlays sit in the gaps between strings (gap g is between strings g and g + 1), never on a string.
    fun gapY(g: Int) = (l.stringY(g) + l.stringY(g + 1)) / 2
    val singleY = gapY((l.stringCount - 2) / 2)
    val doubleOffset = if (l.stringCount > 5) 1 else 0
    val doubleY = listOf(gapY(doubleOffset), gapY(l.stringCount - 2 - doubleOffset))
    for (fret in 1..l.fretCount) {
        val cx = l.x((l.fretWireX(fret - 1) + l.fretWireX(fret)) / 2) * u
        val ys = when (fret) {
            in DOUBLE_INLAY_FRETS -> doubleY
            in INLAY_FRETS -> listOf(singleY)
            else -> emptyList()
        }
        ys.forEach { drawCircle(inlay, 6 * u, Offset(cx, it * u)) }
    }

    for (fret in 1..l.fretCount) {
        val x = l.x(l.fretWireX(fret)) * u
        drawLine(fretWire, Offset(x, l.neckTop * u), Offset(x, l.neckBottom * u), 3 * u)
    }
    drawRoundRect(
        nut,
        Offset((l.x(l.nutX) - 4) * u, (l.neckTop - 2) * u),
        Size(
            8 * u,
            (l.neckBottom - l.neckTop + 4) * u,
        ),
        CornerRadius(2 * u),
    )
}

/** Strings drawn thicker toward the low end (port of Strings.tsx). */
private fun DrawScope.drawStrings(l: FretboardLayout, u: Float, color: Color) {
    val start = l.x(l.stringLabelX + 16) * u
    val end = l.x(l.fretWireX(l.fretCount)) * u
    for (i in 0 until l.stringCount) {
        val y = l.stringY(i) * u
        val width = (1.2f + (l.stringCount - 1 - i) * 0.55f) * u
        drawLine(Color.Black.copy(alpha = 0.45f), Offset(start, y + u), Offset(end, y + u), width)
        drawLine(color, Offset(start, y), Offset(end, y), width)
    }
}
