package com.perceptronics.musicteacher.audio

import android.content.Context
import android.util.Log
import java.util.concurrent.Executors

/**
 * The app-wide audio device: loads the recorded bass once, then opens the stream while the
 * app is visible. All of it runs on one background thread, in order, so the samples are
 * always loaded before the stream starts and nothing blocks the UI.
 */
object BassAudio {
    private val worker = Executors.newSingleThreadExecutor { Thread(it, "BassAudio").apply { isDaemon = true } }
    private var loaded = false

    /** Call when the app comes to the foreground (Activity.onStart). */
    fun start(context: Context) {
        val app = context.applicationContext
        worker.execute {
            if (!loaded) {
                loadSamples(app)
                loaded = true
            }
            if (!NativeAudio.start()) Log.w("BassAudio", "Could not open the audio output")
        }
    }

    /** Call when the app goes to the background (Activity.onStop): frees the audio device. */
    fun stop() {
        worker.execute { NativeAudio.stop() }
    }

    private fun loadSamples(context: Context) {
        val files = context.assets.list(SAMPLES_DIR).orEmpty()
        for (file in files) {
            val midi = sampleMidi(file) ?: continue
            val pcm = readWav(context.assets.open("$SAMPLES_DIR/$file").use { it.readBytes() })
            NativeAudio.loadSample(midi, pcm.data, pcm.rate)
        }
        if (files.isEmpty()) Log.w("BassAudio", "No bass samples in assets/$SAMPLES_DIR")
    }

    /** The audio clock, in frames. */
    fun now(): Long = NativeAudio.framePosition()

    fun sampleRate(): Int = NativeAudio.sampleRate()

    fun frames(seconds: Double): Long = (seconds * sampleRate()).toLong()

    /** Frames from rendering to hearing: subtract from [now] to know what's being heard. */
    fun latencyFrames(): Long = NativeAudio.latencyFrames()

    /** A metronome click (triangle wave), `delay` seconds from now. */
    fun click(frequency: Double, velocity: Float, delay: Double = 0.0) =
        NativeAudio.click(frequency, velocity, now() + frames(delay))
}
