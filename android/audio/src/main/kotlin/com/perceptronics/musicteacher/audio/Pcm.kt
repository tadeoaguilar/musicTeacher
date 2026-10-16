package com.perceptronics.musicteacher.audio

import java.nio.ByteBuffer
import java.nio.ByteOrder

/** A mono recording: samples in -1..1 at [rate] Hz. */
class Pcm(val data: FloatArray, val rate: Int)

/**
 * Reads the 16-bit PCM WAVs that `npm run samples` writes for Android. Mixes down to mono if
 * needed; rejects other formats with a clear message rather than playing noise.
 */
fun readWav(bytes: ByteArray): Pcm {
    val buffer = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
    fun tag(): String = String(ByteArray(4).also { buffer.get(it) }, Charsets.US_ASCII)
    require(tag() == "RIFF") { "Not a WAV file" }
    buffer.int
    require(tag() == "WAVE") { "Not a WAV file" }
    var channels = 0
    var rate = 0
    var bits = 0
    while (buffer.remaining() >= 8) {
        val id = tag()
        val size = buffer.int
        when (id) {
            "fmt " -> {
                val format = buffer.short.toInt()
                channels = buffer.short.toInt()
                rate = buffer.int
                buffer.position(buffer.position() + 6)
                bits = buffer.short.toInt()
                require(format == 1 && bits == 16) { "Only 16-bit PCM WAV is supported (format $format, $bits bits)" }
                buffer.position(buffer.position() + size - 16)
            }

            "data" -> {
                require(channels > 0) { "WAV data before its format" }
                val frames = minOf(size, buffer.remaining()) / (2 * channels)
                val data = FloatArray(frames) {
                    var sum = 0f
                    repeat(channels) { sum += buffer.short / 32768f }
                    sum / channels
                }
                return Pcm(data, rate)
            }

            else -> buffer.position(buffer.position() + size + (size and 1))
        }
    }
    throw IllegalArgumentException("WAV file has no data")
}
