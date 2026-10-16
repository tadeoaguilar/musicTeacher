package com.perceptronics.musicteacher.audio

/**
 * The C++ engine (src/main/cpp/BassEngine.cpp, built on Oboe). Times are frame positions
 * on the engine's own clock ([framePosition]), which keeps counting across stream restarts.
 */
internal object NativeAudio {
    init {
        System.loadLibrary("bassically_audio")
    }

    external fun start(): Boolean

    external fun stop()

    /** Load every sample before the first [start]: the audio thread reads them without locks. */
    external fun loadSample(midi: Int, data: FloatArray, rate: Int)

    external fun note(frequency: Double, velocity: Float, startFrame: Long, durationFrames: Long)

    external fun click(frequency: Double, velocity: Float, startFrame: Long)

    /** Cancels everything scheduled and fades out what's sounding. */
    external fun stopAll()

    external fun framePosition(): Long

    external fun sampleRate(): Int

    /** Frames between rendering a frame and hearing it (an estimate from Oboe). */
    external fun latencyFrames(): Long
}
