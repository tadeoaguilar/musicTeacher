package com.perceptronics.musicteacher.audio

import com.perceptronics.musicteacher.core.theory.noteMidi
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** A minimal 16-bit PCM WAV, with an extra chunk before the data like some encoders write. */
private fun wav(channels: Int, rate: Int, vararg samples: Short): ByteArray {
    val data = ByteBuffer.allocate(samples.size * 2).order(ByteOrder.LITTLE_ENDIAN)
    samples.forEach { data.putShort(it) }
    return ByteBuffer.allocate(12 + 24 + 10 + 8 + samples.size * 2).order(ByteOrder.LITTLE_ENDIAN).apply {
        put("RIFF".toByteArray()).putInt(0).put("WAVE".toByteArray())
        put("fmt ".toByteArray()).putInt(16).putShort(1).putShort(channels.toShort()).putInt(rate)
        putInt(rate * channels * 2).putShort((channels * 2).toShort()).putShort(16)
        put("LIST".toByteArray()).putInt(1).put(0).put(0) // odd size + pad byte
        put("data".toByteArray()).putInt(samples.size * 2).put(data.array())
    }.array()
}

class SamplesTest {
    @Test
    fun readsSixteenBitWav() {
        val pcm = readWav(wav(1, 44100, 0, 16384, -32768))
        assertEquals(44100, pcm.rate)
        assertContentEquals(floatArrayOf(0f, 0.5f, -1f), pcm.data)
    }

    @Test
    fun mixesStereoToMono() = assertContentEquals(floatArrayOf(0.25f), readWav(wav(2, 48000, 16384, 0)).data)

    @Test
    fun rejectsOtherFiles() {
        assertFailsWith<IllegalArgumentException> { readWav("not a wav file at all".toByteArray()) }
    }

    @Test
    fun readsSampleNamesWithSForSharp() {
        assertEquals(28, sampleMidi("E1.wav"))
        assertEquals(34, sampleMidi("samples/bass/As1.wav"))
        assertEquals(49, sampleMidi("Cs3.wav"))
        assertNull(sampleMidi("E1.mp3"))
        assertNull(sampleMidi("take.wav"))
    }

    private val shipped = File("src/main/assets/$SAMPLES_DIR").listFiles().orEmpty()

    @Test
    fun theShippedSamplesCoverEveryFourStringNoteWithNoGapOver3Semitones() {
        val midis = shipped.mapNotNull { sampleMidi(it.name) }.sorted()
        assertTrue(midis.first() <= noteMidi("E1") && midis.last() >= noteMidi("G3"), "covers E1–G3: $midis")
        assertTrue(midis.zipWithNext().all { (a, b) -> b - a <= 3 }, "no gap over 3 semitones: $midis")
    }

    @Test
    fun theShippedSamplesAre3SecondsOfMono44kAudio() {
        for (file in shipped) {
            val pcm = readWav(file.readBytes())
            assertEquals(44100, pcm.rate, file.name)
            assertTrue(pcm.data.size in 120_000..133_000, "${file.name}: ${pcm.data.size} frames")
            assertTrue(pcm.data.maxOf { kotlin.math.abs(it) } > 0.1f, "${file.name} isn't silent")
        }
    }
}
