package com.perceptronics.musicteacher.audio

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.perceptronics.musicteacher.core.pitch.DetectOptions
import com.perceptronics.musicteacher.core.pitch.MAX_HZ
import com.perceptronics.musicteacher.core.pitch.MIN_HZ
import com.perceptronics.musicteacher.core.pitch.detectPitch
import com.perceptronics.musicteacher.core.pitch.downsample
import com.perceptronics.musicteacher.core.pitch.rms
import kotlin.math.max
import kotlin.math.roundToInt

// Port of src/audio/MicInput.ts.

/** ~170 ms at 48 kHz: more than two periods of the lowest note, A0. */
private const val WINDOW = 8192

/** Bass pitch needs only a few kHz, so detection runs on ~12 kHz audio. */
private const val DETECT_RATE = 12000
private const val INTERVAL_MS = 50

/** 48 kHz is what phones run at natively; 44.1 kHz is the one rate every phone must support. */
private val RATES = listOf(48000, 44100)

/** One analysis, about 20 times a second. */
data class MicFrame(
    /** Detected pitch, or null when no clear note is ringing. */
    val hz: Double?,
    /** RMS input level, 0–1. */
    val level: Double,
)

/**
 * Listens to the microphone and reports the input level and detected pitch about 20 times a
 * second. Voice processing (automatic gain, noise suppression, echo cancellation) filters out
 * low notes and fights sustained ones, so it reads the UNPROCESSED source where the phone has
 * one, and VOICE_RECOGNITION (which skips most processing) otherwise.
 *
 * A tuner doesn't need low latency, so this uses AudioRecord rather than Oboe: the samples
 * stay in Kotlin, where the ported pitch detector runs.
 */
object MicInput {
    private val main = Handler(Looper.getMainLooper())

    @Volatile private var generation = 0

    /** False if the microphone couldn't be opened (no permission, no device, or it's busy). */
    fun start(context: Context, onFrame: (MicFrame) -> Unit): Boolean {
        stop()
        val record = open(context) ?: return false
        val run = generation
        Thread({ listen(record, run, onFrame) }, "MicInput").start()
        return true
    }

    fun stop() {
        generation++
    }

    private fun open(context: Context): AudioRecord? {
        if (context.checkSelfPermission(Manifest.permission.RECORD_AUDIO) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            return null
        }
        val audio = context.getSystemService(AudioManager::class.java)
        val unprocessed = audio.getProperty(AudioManager.PROPERTY_SUPPORT_AUDIO_SOURCE_UNPROCESSED) == "true"
        val sources = listOfNotNull(
            MediaRecorder.AudioSource.UNPROCESSED.takeIf { unprocessed },
            MediaRecorder.AudioSource.VOICE_RECOGNITION,
            MediaRecorder.AudioSource.MIC,
        )
        for (rate in RATES) {
            val minBuffer = AudioRecord.getMinBufferSize(
                rate,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_FLOAT,
            )
            if (minBuffer <= 0) continue
            for (source in sources) {
                val record = try {
                    AudioRecord(
                        source,
                        rate,
                        AudioFormat.CHANNEL_IN_MONO,
                        AudioFormat.ENCODING_PCM_FLOAT,
                        max(
                            minBuffer,
                            WINDOW * 4,
                        ),
                    )
                } catch (e: IllegalArgumentException) {
                    Log.w("MicInput", "source $source at $rate Hz unavailable", e)
                    continue
                }
                if (record.state == AudioRecord.STATE_INITIALIZED) return record
                record.release()
            }
        }
        return null
    }

    private fun listen(record: AudioRecord, run: Int, onFrame: (MicFrame) -> Unit) {
        val rate = record.sampleRate
        val factor = max(1, (rate.toDouble() / DETECT_RATE).roundToInt())
        val options = DetectOptions(minHz = MIN_HZ, maxHz = MAX_HZ)
        // The latest WINDOW samples, oldest first; each read of ~50 ms shifts in new audio.
        val window = FloatArray(WINDOW)
        val chunk = FloatArray(rate * INTERVAL_MS / 1000)
        try {
            record.startRecording()
            while (run == generation) {
                val n = record.read(chunk, 0, chunk.size, AudioRecord.READ_BLOCKING)
                if (n <= 0) break
                System.arraycopy(window, n, window, 0, WINDOW - n)
                System.arraycopy(chunk, 0, window, WINDOW - n, n)
                val pitch = detectPitch(downsample(window, factor), rate.toDouble() / factor, options)
                val frame = MicFrame(pitch?.hz, rms(window))
                main.post { if (run == generation) onFrame(frame) }
            }
        } finally {
            record.stop()
            record.release()
        }
    }
}
