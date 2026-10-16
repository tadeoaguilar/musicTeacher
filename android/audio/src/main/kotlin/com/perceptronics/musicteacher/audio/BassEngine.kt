package com.perceptronics.musicteacher.audio

import android.os.Handler
import android.os.Looper
import com.perceptronics.musicteacher.core.theory.midiToFrequency

// Port of src/audio/BassEngine.ts: notes and sequences on the recorded bass, timed on the audio clock.

/** How far ahead sequence notes are handed to the audio thread (like the web metronome). */
private const val LOOKAHEAD_SECONDS = 0.15

/** Scheduler wake-up interval. */
private const val TICK_MS = 10L

/** Default note length: an eighth note at 120 BPM, like Tone's '8n'. */
private const val PLUCK_SECONDS = 0.25

object BassEngine : AudioEngine {
    private val main = Handler(Looper.getMainLooper())

    @Volatile private var bpm = 120

    @Volatile private var generation = 0
    private var onNote: ((Int?) -> Unit)? = null

    override fun playNote(midi: Int, options: NoteOptions) {
        val start = BassAudio.now() + BassAudio.frames(options.delay)
        NativeAudio.note(
            midiToFrequency(midi, options.a4),
            1f,
            start,
            BassAudio.frames(options.duration ?: PLUCK_SECONDS),
        )
    }

    override fun playSequence(midis: List<Int>, options: SequenceOptions) {
        stop()
        if (midis.isEmpty()) return
        onNote = options.onNote
        bpm = options.bpm
        val run = generation
        Thread({ sequence(midis, options.loop, run) }, "BassSequence").start()
    }

    /** One note per beat, scheduled ahead on the audio clock; `onNote` fires when each one is heard. */
    private fun sequence(midis: List<Int>, loop: Boolean, run: Int) {
        val beat = { BassAudio.frames(60.0 / bpm) }
        var next = BassAudio.now() + BassAudio.frames(0.05)
        var i = 0
        var end = Long.MAX_VALUE
        val heardAt = ArrayDeque<Pair<Long, Int>>()
        while (run == generation) {
            val now = BassAudio.now()
            while (next < now + BassAudio.frames(LOOKAHEAD_SECONDS) && (loop || i < midis.size)) {
                val index = i % midis.size
                NativeAudio.note(midiToFrequency(midis[index]), 1f, next, beat() / 2)
                heardAt += next to index
                next += beat()
                i++
                // Like the web: the sequence ends a beat after the last note starts.
                if (!loop && i == midis.size) end = next
            }
            val heard = now - BassAudio.latencyFrames()
            while (heardAt.isNotEmpty() && heardAt.first().first <= heard) {
                val index = heardAt.removeFirst().second
                main.post { if (run == generation) onNote?.invoke(index) }
            }
            if (heard >= end) {
                main.post { if (run == generation) stop() }
                return
            }
            Thread.sleep(TICK_MS)
        }
    }

    override fun setBpm(bpm: Int) {
        this.bpm = bpm
    }

    override fun stop() {
        generation++
        NativeAudio.stopAll()
        val callback = onNote
        onNote = null
        callback?.invoke(null)
    }
}
