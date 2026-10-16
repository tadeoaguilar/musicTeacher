package com.perceptronics.musicteacher.audio

import com.perceptronics.musicteacher.core.rhythm.BarEvent
import com.perceptronics.musicteacher.core.rhythm.BarEventKind
import com.perceptronics.musicteacher.core.rhythm.BarPlan
import com.perceptronics.musicteacher.core.rhythm.BarSettings
import com.perceptronics.musicteacher.core.rhythm.TrainerSettings
import com.perceptronics.musicteacher.core.rhythm.barPlan
import com.perceptronics.musicteacher.core.rhythm.buildBar
import com.perceptronics.musicteacher.core.rhythm.getMeter
import com.perceptronics.musicteacher.core.theory.midiToFrequency

// Port of src/audio/MetronomeEngine.ts, on the Oboe engine's frame clock.

/** Everything the metronome reads, beat by beat, while it runs. */
data class EngineSettings(
    val bar: BarSettings,
    val trainer: TrainerSettings,
    val rootMidi: Int,
    /** Volumes, 0–100. */
    val click: Int,
    val bass: Int,
)

/** Where playback is right now, as heard (output latency included). */
data class MetronomePosition(
    val bar: Int,
    val beat: Int,
    /** 0–1 through the current beat. */
    val progress: Double,
    val beats: Int,
    val plan: BarPlan,
)

private class ScheduledBeat(
    val bar: Int,
    val beat: Int,
    val beats: Int,
    val plan: BarPlan,
    val start: Long,
    val duration: Long,
)

/** How far ahead (seconds) sounds are scheduled on the audio clock. */
private const val LOOKAHEAD_SECONDS = 0.15

/** Scheduler wake-up interval (the web's worker ticks every 25 ms). */
private const val TICK_MS = 10L

private class Click(val frequency: Double, val velocity: Float)

private val CLICKS = mapOf(
    BarEventKind.ACCENT to Click(1760.0, 1f),
    BarEventKind.NORMAL to Click(1175.0, 0.75f),
    BarEventKind.SUB to Click(880.0, 0.4f),
)

/** 0–100 slider → gain, on a curve that sounds even. */
private fun gainOf(volume: Int) = (volume / 100f).let { it * it }

/**
 * Sample-accurate metronome: a thread wakes every 10 ms and queues the next beats on the
 * audio clock. Settings are read beat by beat, so tempo, accents and patterns can change
 * while it runs; volumes apply to sounds scheduled from then on (about 150 ms later).
 */
object MetronomeEngine {
    @Volatile private var generation = 0
    private val scheduled = ArrayDeque<ScheduledBeat>()

    fun start(settings: () -> EngineSettings) {
        stop()
        val run = generation
        Thread({ loop(settings, run) }, "Metronome").start()
    }

    fun stop() {
        generation++
        synchronized(scheduled) { scheduled.clear() }
        NativeAudio.stopAll()
    }

    /** Null when stopped or before the first beat is heard. */
    fun position(): MetronomePosition? {
        val heard = BassAudio.now() - BassAudio.latencyFrames()
        val current = synchronized(scheduled) { scheduled.lastOrNull { it.start <= heard } } ?: return null
        val progress = minOf(1.0, (heard - current.start).toDouble() / current.duration)
        return MetronomePosition(current.bar, current.beat, progress, current.beats, current.plan)
    }

    private fun loop(settings: () -> EngineSettings, run: Int) {
        // Frames as a Double, so rounding never accumulates over a long session.
        var nextBeat = (BassAudio.now() + BassAudio.frames(0.1)).toDouble()
        var bar = 0
        var beat = 0
        var plan: BarPlan? = null
        while (run == generation) {
            val now = BassAudio.now()
            while (nextBeat < now + BassAudio.frames(LOOKAHEAD_SECONDS) && run == generation) {
                val s = settings()
                val meter = getMeter(s.bar.meter)
                if (beat >= meter.beats) {
                    beat = 0
                    bar++
                }
                val current = plan.takeIf { beat != 0 } ?: barPlan(bar, s.trainer)
                plan = current
                // The speed trainer owns the tempo; otherwise tempo changes apply from the next beat.
                val bpm = if (s.trainer.speed != null) current.bpm else s.trainer.bpm
                val framesPerBeat = 60.0 / bpm * BassAudio.sampleRate()

                if (!current.muted) {
                    val events = if (current.countIn) {
                        listOf(
                            BarEvent(
                                if (beat ==
                                    0
                                ) {
                                    BarEventKind.ACCENT
                                } else {
                                    BarEventKind.NORMAL
                                },
                                beat.toDouble(),
                                beat,
                            ),
                        )
                    } else {
                        buildBar(s.bar).filter { it.at >= beat && it.at < beat + 1 }
                    }
                    for (e in events) play(e, (nextBeat + (e.at - beat) * framesPerBeat).toLong(), framesPerBeat, s)
                }

                synchronized(scheduled) {
                    scheduled +=
                        ScheduledBeat(bar, beat, meter.beats, current, nextBeat.toLong(), framesPerBeat.toLong())
                    val old = now - BassAudio.frames(4.0)
                    while (scheduled.isNotEmpty() && scheduled.first().start <= old) scheduled.removeFirst()
                }
                nextBeat += framesPerBeat
                beat++
            }
            Thread.sleep(TICK_MS)
        }
    }

    private fun play(e: BarEvent, frame: Long, framesPerBeat: Double, s: EngineSettings) {
        if (e.kind == BarEventKind.BASS) {
            val length = maxOf(BassAudio.frames(0.06).toDouble(), (e.duration ?: 1.0) * framesPerBeat * 0.9)
            NativeAudio.note(midiToFrequency(s.rootMidi), 0.9f * gainOf(s.bass), frame, length.toLong())
            return
        }
        val click = CLICKS.getValue(e.kind)
        NativeAudio.click(click.frequency, click.velocity * gainOf(s.click), frame)
    }
}
