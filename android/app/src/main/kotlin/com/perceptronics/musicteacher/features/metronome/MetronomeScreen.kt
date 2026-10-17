package com.perceptronics.musicteacher.features.metronome

import android.content.Context
import android.os.SystemClock
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedIconButton
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.viewmodel.compose.viewModel
import com.perceptronics.musicteacher.R
import com.perceptronics.musicteacher.audio.EngineSettings
import com.perceptronics.musicteacher.audio.MetronomeEngine
import com.perceptronics.musicteacher.core.rhythm.BPM_MAX
import com.perceptronics.musicteacher.core.rhythm.BPM_MIN
import com.perceptronics.musicteacher.core.rhythm.METER_IDS
import com.perceptronics.musicteacher.core.rhythm.RhythmLayout
import com.perceptronics.musicteacher.core.rhythm.canSwing
import com.perceptronics.musicteacher.core.rhythm.cycleAccent
import com.perceptronics.musicteacher.core.rhythm.findPattern
import com.perceptronics.musicteacher.core.rhythm.getMeter
import com.perceptronics.musicteacher.core.rhythm.layoutRhythm
import com.perceptronics.musicteacher.core.rhythm.patternsFor
import com.perceptronics.musicteacher.core.rhythm.subdivisionPattern
import com.perceptronics.musicteacher.core.rhythm.subdivisionsFor
import com.perceptronics.musicteacher.core.rhythm.tapTempo
import com.perceptronics.musicteacher.core.theory.KEY_IDS
import com.perceptronics.musicteacher.core.theory.formatNote
import com.perceptronics.musicteacher.core.theory.keySpellings
import com.perceptronics.musicteacher.features.neck.SavedSettings
import com.perceptronics.musicteacher.features.pro.ProSlot
import com.perceptronics.musicteacher.i18n.LocalLocale
import com.perceptronics.musicteacher.i18n.t
import com.perceptronics.musicteacher.ui.controls.Chips
import com.perceptronics.musicteacher.ui.controls.Dropdown
import com.perceptronics.musicteacher.ui.controls.LabeledSlider
import com.perceptronics.musicteacher.ui.controls.Option
import com.perceptronics.musicteacher.ui.controls.Panel
import com.perceptronics.musicteacher.ui.controls.Stepper
import com.perceptronics.musicteacher.ui.controls.Toggle
import com.perceptronics.musicteacher.ui.metronome.BeatLights
import com.perceptronics.musicteacher.ui.metronome.Pendulum
import com.perceptronics.musicteacher.ui.metronome.RhythmStaff
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.roundToInt

// Port of src/features/metronome/MetronomePage.tsx.

private const val SWING_ARC = 28f // degrees either side

private val SIMPLE_SUBS =
    mapOf(1 to "quarter", 2 to "eighth", 3 to "triplet", 4 to "sixteenth", 6 to "sixteenthTriplet")
private val COMPOUND_SUBS = mapOf(1 to "dottedQuarter", 3 to "compoundEighth", 6 to "compoundSixteenth")

/** What the screen shows about the moment being heard. */
private data class Playhead(
    val bar: Int,
    val beat: Int,
    val step: Int,
    val note: Int?,
    val countIn: Boolean,
    val muted: Boolean,
    val bpm: Int,
    val barsToNextStep: Int?,
)

/** Index of the note or rest at a point in the bar. */
private fun noteAt(layout: RhythmLayout, tick: Double): Int? = layout.glyphs.lastOrNull { it.start <= tick }?.index

class MetronomeViewModel(private val saved: SavedSettings) : ViewModel() {
    var settings by mutableStateOf(MetronomeSettings.fromParams(saved.load("metronome")))
        private set
    var isRunning by mutableStateOf(false)
        private set

    // The engine reads the latest settings beat by beat, without restarting.
    @Volatile private var engineSettings: EngineSettings = settings.toEngine()
    private var taps = emptyList<Long>()

    fun change(new: MetronomeSettings) {
        settings = new
        engineSettings = new.toEngine()
        saved.save("metronome", new.toParams())
    }

    fun start() {
        isRunning = true
        MetronomeEngine.start { engineSettings }
    }

    fun stop() {
        if (!isRunning) return
        MetronomeEngine.stop()
        isRunning = false
    }

    fun toggle() = if (isRunning) stop() else start()

    fun tap() {
        val result = tapTempo(taps, SystemClock.uptimeMillis())
        taps = result.taps
        result.bpm?.let { change(settings.copy(bpm = it)) }
    }

    fun nudge(delta: Int) = change(settings.copy(bpm = (settings.bpm + delta).coerceIn(BPM_MIN, BPM_MAX)))

    override fun onCleared() = stop()

    companion object {
        fun create(context: Context) = MetronomeViewModel(SavedSettings(context.applicationContext))
    }
}

@Composable
fun MetronomeScreen() {
    val context = LocalContext.current
    val vm = viewModel { MetronomeViewModel.create(context) }
    val s = vm.settings
    val meter = getMeter(s.meter)
    val pattern = findPattern(s.meter, s.pattern)
    val layout =
        remember(pattern, s.meter, s.sub) { layoutRhythm(pattern ?: subdivisionPattern(s.meter, s.sub), s.meter) }

    // Stop when leaving the screen or the app (background playback comes with phase 5b).
    DisposableEffect(Unit) { onDispose { vm.stop() } }
    LifecycleEventEffect(Lifecycle.Event.ON_STOP) { vm.stop() }

    // Keep the phone awake while practicing.
    val view = LocalView.current
    DisposableEffect(vm.isRunning) {
        view.keepScreenOn = vm.isRunning
        onDispose { view.keepScreenOn = false }
    }

    // Animation: the pendulum angle changes every frame but is read only while drawing; the
    // playhead changes state only when the beat, step or note does.
    var angle by remember { mutableFloatStateOf(0f) }
    var playhead by remember { mutableStateOf<Playhead?>(null) }
    val latest by rememberUpdatedState(s)
    val latestLayout by rememberUpdatedState(layout)
    LaunchedEffect(vm.isRunning) {
        angle = 0f
        playhead = null
        while (vm.isRunning) {
            withFrameNanos { }
            val pos = MetronomeEngine.position() ?: continue
            val l = latestLayout
            val globalBeat = pos.bar * pos.beats + pos.beat
            angle = SWING_ARC * cos(PI * (globalBeat + pos.progress)).toFloat()
            val next = Playhead(
                bar = pos.bar,
                beat = pos.beat,
                step = if (pos.plan.countIn) 0 else floor(pos.progress * latest.sub).toInt(),
                note = if (pos.plan.countIn) null else noteAt(l, (pos.beat + pos.progress) * l.beatTicks),
                countIn = pos.plan.countIn,
                muted = pos.plan.muted,
                bpm = if (latest.speedOn) pos.plan.bpm else latest.bpm,
                barsToNextStep = pos.plan.barsToNextStep,
            )
            if (next != playhead) playhead = next
        }
    }

    val p = playhead
    val status = when {
        p == null -> null
        p.countIn -> t("metronome.countingIn")
        p.muted -> t("metronome.silentBar")
        else -> t("metronome.bar", "bar" to p.bar + 1 - (if (s.countIn) 1 else 0))
    }
    val trainerStatus = if (p != null && s.speedOn && !p.countIn) {
        val next = p.barsToNextStep?.let { t("metronome.nextStep", "count" to it) } ?: t("metronome.reachedTarget")
        "${t("metronome.nowPlaying", "bpm" to p.bpm)} · $next"
    } else {
        null
    }
    val patternName = pattern?.let { t("metronome.patterns.${it.id}") } ?: t("metronome.none")

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(
            t("metronome.title"),
            style = MaterialTheme.typography.headlineMedium,
            modifier = Modifier.semantics {
                heading()
            },
        )
        Text(
            t("metronome.description"),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        Panel {
            Tempo(vm)
            Column(
                Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Pendulum({ angle })
                BeatLights(
                    accents = s.accents,
                    sub = if (p?.countIn == true) 1 else s.sub,
                    beat = p?.beat,
                    step = p?.step,
                    countIn = p?.countIn == true,
                ) { i ->
                    vm.change(
                        s.copy(
                            accents = s.accents.mapIndexed { j, a ->
                                if (j ==
                                    i
                                ) {
                                    cycleAccent(a)
                                } else {
                                    a
                                }
                            },
                        ),
                    )
                }
                Text(
                    listOfNotNull(status, trainerStatus).joinToString(" · "),
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
                )
                Text(
                    t("metronome.accentsHelp"),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        Panel {
            RhythmStaff(
                layout = layout,
                meter = s.meter,
                active = if (p?.muted == true) null else p?.note,
                label = t("metronome.notationLabel", "pattern" to patternName, "meter" to meter.id),
            )
        }

        RhythmControls(s, vm::change)
        TrainerControls(s, vm::change)
        ProSlot("rhythm.programs")
    }
}

@Composable
private fun Tempo(vm: MetronomeViewModel) {
    val s = vm.settings
    Row(
        Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceEvenly,
    ) {
        val slower = t("metronome.slower")
        val faster = t("metronome.faster")
        OutlinedIconButton({ vm.nudge(-1) }, Modifier.semantics { contentDescription = slower }) {
            Text("−", style = MaterialTheme.typography.headlineSmall)
        }
        Row(verticalAlignment = Alignment.Bottom) {
            Text(
                s.bpm.toString(),
                style = MaterialTheme.typography.displayMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
            )
            Text(
                "BPM",
                style = MaterialTheme.typography.titleSmall,
                modifier = Modifier.padding(start = 6.dp, bottom = 8.dp),
            )
        }
        OutlinedIconButton({ vm.nudge(1) }, Modifier.semantics { contentDescription = faster }) {
            Text("+", style = MaterialTheme.typography.headlineSmall)
        }
    }
    val tempo = t("metronome.tempo")
    Slider(
        value = s.bpm.toFloat(),
        onValueChange = { vm.change(s.copy(bpm = it.roundToInt())) },
        valueRange = BPM_MIN.toFloat()..BPM_MAX.toFloat(),
        modifier = Modifier.semantics { contentDescription = tempo },
    )
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Button(
            onClick = vm::toggle,
            modifier = Modifier.weight(1f),
            colors = if (vm.isRunning) {
                ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary)
            } else {
                ButtonDefaults.buttonColors()
            },
        ) {
            Icon(
                painterResource(if (vm.isRunning) R.drawable.ic_stop else R.drawable.ic_play),
                contentDescription = null,
            )
            Text(if (vm.isRunning) t("metronome.stop") else t("metronome.start"), Modifier.padding(start = 8.dp))
        }
        OutlinedButton(onClick = vm::tap, modifier = Modifier.weight(1f)) { Text(t("metronome.tap")) }
    }
}

@Composable
private fun RhythmControls(s: MetronomeSettings, onChange: (MetronomeSettings) -> Unit) {
    val locale = LocalLocale.current
    val meter = getMeter(s.meter)
    val subNames = if (meter.compound) COMPOUND_SUBS else SIMPLE_SUBS
    val swingable = canSwing(meter, s.sub)
    Panel {
        Chips(t("metronome.meter"), s.meter, METER_IDS.map { Option(it, it) }) { onChange(s.withMeter(it)) }
        Chips(
            t("metronome.subdivision"),
            s.sub,
            subdivisionsFor(meter).map {
                Option(it, t("metronome.subs.${subNames.getValue(it)}"))
            },
        ) {
            onChange(s.copy(sub = it))
        }
        LabeledSlider(
            t("metronome.swing"),
            if (s.swing == 0 || !swingable) t("metronome.straight") else "${s.swing} %",
            s.swing,
            0..100,
            { onChange(s.copy(swing = it)) },
            enabled = swingable,
        )
        Dropdown(
            t("metronome.pattern"),
            s.pattern,
            // The library lists basics before grooves, so groups come out contiguous.
            listOf(Option("none", t("metronome.none"))) +
                patternsFor(s.meter).map {
                    Option(it.id, t("metronome.patterns.${it.id}"), t("metronome.groups.${it.group.name.lowercase()}"))
                },
        ) { onChange(s.copy(pattern = it)) }
        Dropdown(
            t("metronome.root"),
            s.root,
            KEY_IDS.map { key -> Option(key, keySpellings(key).joinToString("/") { formatNote(it, locale) }) },
        ) { onChange(s.copy(root = it)) }
        LabeledSlider(t("metronome.clickVolume"), "${s.click} %", s.click, 0..100, { onChange(s.copy(click = it)) })
        LabeledSlider(
            t("metronome.bassVolume"),
            "${s.bass} %",
            s.bass,
            0..100,
            { onChange(s.copy(bass = it)) },
            enabled = s.pattern != "none",
        )
        Toggle(t("metronome.countIn"), s.countIn) { onChange(s.copy(countIn = it)) }
    }
}

@Composable
private fun TrainerControls(s: MetronomeSettings, onChange: (MetronomeSettings) -> Unit) {
    val help = @Composable { text: String ->
        Text(text, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
    Panel {
        Toggle(t("metronome.speedTrainer"), s.speedOn) { onChange(s.copy(speedOn = it)) }
        help(t("metronome.speedHelp"))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Stepper(t("metronome.target"), s.speed.target, BPM_MIN..BPM_MAX, {
                onChange(s.copy(speed = s.speed.copy(target = it)))
            }, s.speedOn)
            Stepper(t("metronome.step"), s.speed.step, 1..50, {
                onChange(s.copy(speed = s.speed.copy(step = it)))
            }, s.speedOn)
            Stepper(t("metronome.every"), s.speed.every, 1..32, {
                onChange(s.copy(speed = s.speed.copy(every = it)))
            }, s.speedOn)
        }
    }
    Panel {
        Toggle(t("metronome.gapTrainer"), s.gapOn) { onChange(s.copy(gapOn = it)) }
        help(t("metronome.gapHelp"))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Stepper(t("metronome.play"), s.gap.play, 1..16, { onChange(s.copy(gap = s.gap.copy(play = it))) }, s.gapOn)
            Stepper(t("metronome.mute"), s.gap.mute, 1..16, { onChange(s.copy(gap = s.gap.copy(mute = it))) }, s.gapOn)
        }
    }
}
