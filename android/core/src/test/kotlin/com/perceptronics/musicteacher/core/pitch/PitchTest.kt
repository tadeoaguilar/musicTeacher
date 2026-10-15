package com.perceptronics.musicteacher.core.pitch

import com.perceptronics.musicteacher.core.theory.frequencyToMidi
import com.perceptronics.musicteacher.core.theory.getTuning
import com.perceptronics.musicteacher.core.theory.midiToFrequency
import com.perceptronics.musicteacher.core.theory.noteMidi
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.ln
import kotlin.math.log2
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

// Port of src/pitch/pitch.test.ts.

private const val RATE = 48000.0
private const val FACTOR = 4
private const val WINDOW = 8192

/** A bass-like tone: weak fundamental, louder 2nd and 3rd harmonics. */
internal fun bassTone(hz: Double, harmonics: List<Double> = listOf(0.3, 1.0, 0.6, 0.3, 0.15)) =
    FloatArray(WINDOW) { i ->
        var v = 0.0
        harmonics.forEachIndexed { h, amp -> v += amp * sin((2 * PI * hz * (h + 1) * i) / RATE + h) }
        (0.2 * v).toFloat()
    }

/** White noise plus 60/120 Hz hum at a given RMS level, seeded so tests are repeatable. */
internal fun roomNoise(seed: Long, level: Double): FloatArray {
    var state = seed.toDouble()
    val random = {
        state = (state * 16807) % 2147483647
        state / 2147483647
    }
    return FloatArray(WINDOW) { i ->
        val gauss = sqrt(-2 * ln(random() + 1e-12)) * cos(2 * PI * random())
        val hum = 0.3 * sin((2 * PI * 60 * i) / RATE) + 0.2 * sin((2 * PI * 120 * i) / RATE)
        (level * (gauss + hum)).toFloat()
    }
}

private fun detect(samples: FloatArray) =
    detectPitch(downsample(samples, FACTOR), RATE / FACTOR, DetectOptions(MIN_HZ, MAX_HZ))

private fun centsOff(hz: Double, target: Double) = 1200 * log2(hz / target)

class PitchTest {
    private val notes = listOf("A0", "B0", "E1", "A1", "D2", "G2", "C3")

    @Test
    fun findsEveryNoteFromAPureSineAndAWeakFundamental() {
        for (note in notes) {
            val target = midiToFrequency(noteMidi(note))
            assertTrue(abs(centsOff(detect(bassTone(target, listOf(1.0)))!!.hz, target)) < 1, note)
            val pitch = detect(bassTone(target))!!
            assertTrue(abs(centsOff(pitch.hz, target)) < 1, note)
            assertTrue(pitch.clarity > 0.85, note)
        }
    }

    @Test
    fun measuresASlightlyFlatString() {
        val target = 55 * 2.0.pow(-12.0 / 1200)
        assertEquals(-12.0, centsOff(detect(bassTone(target))!!.hz, 55.0), 0.5)
    }

    @Test
    fun ignoresSilenceNoiseAndHum() {
        assertNull(detect(FloatArray(WINDOW)))
        assertNull(detect(roomNoise(1, 0.15)))
        for (seed in 1L..20L) assertNull(detect(roomNoise(seed, 0.002)))
    }

    // An unplugged bass heard by a laptop mic: very quiet, with room noise 10 dB below it.
    @Test
    fun findsQuietStringsThroughRoomNoise() {
        for (note in listOf("E1", "A1", "D2", "G2")) {
            val target = midiToFrequency(noteMidi(note))
            val level = 0.003
            var found = 0
            for (seed in 1L..20L) {
                val tone = bassTone(target)
                val noise = roomNoise(seed, level / sqrt(10.0))
                val mixed = FloatArray(WINDOW) { (tone[it] * (level / 0.2) + noise[it]).toFloat() }
                val pitch = detect(mixed) ?: continue
                // Whatever is reported must be the right note, never another octave.
                assertTrue(abs(centsOff(pitch.hz, target)) < 15, note)
                found++
            }
            assertTrue(found >= 17, "$note found $found/20")
        }
    }

    @Test
    fun readsNotesAndCents() {
        assertEquals(NoteReading(33, 0.0, "A1"), readNote(55.0))
        val sharp = readNote(midiToFrequency(noteMidi("E1")) * 2.0.pow(10.0 / 1200))
        assertEquals("E1", sharp.name)
        assertEquals(10.0, sharp.cents, 1e-5)
        assertEquals("B0", readNote(30.87).name)
        assertEquals("Bb0", readNote(midiToFrequency(noteMidi("Bb0"))).name)
        assertTrue(readNote(54.0).cents < 0)
        assertEquals(69.0, frequencyToMidi(432.0, 432.0))
        assertEquals(NoteReading(33, 0.0, "A1"), readNote(54.0, 432.0))
        assertEquals(-31.8, readNote(54.0, 440.0).cents, 0.5)
    }

    @Test
    fun matchesOpenStrings() {
        assertEquals(1, matchString(noteMidi("A1"), getTuning("4-standard")!!))
        assertEquals(0, matchString(noteMidi("B0"), getTuning("5-standard")!!))
        assertEquals(0, matchString(noteMidi("D1"), getTuning("4-drop-d")!!))
        assertNull(matchString(noteMidi("E1"), getTuning("4-drop-d")!!))
        assertNull(matchString(noteMidi("E2"), getTuning("4-standard")!!))
    }

    @Test
    fun smoothsReadings() {
        val s = Smoother()
        for (hz in listOf(55.0, 55.1, 54.9, 55.0)) s.push(hz)
        assertEquals(55.0, s.push(110.0)!!, 0.5)

        val waits = Smoother()
        assertNull(waits.push(70.0))
        assertNull(waits.push(55.0))
        assertEquals(55.0, waits.push(55.0))

        val holds = Smoother()
        repeat(3) { holds.push(55.0) }
        repeat(6) { assertEquals(55.0, holds.push(null)) }
        assertNull(holds.push(null))

        val follows = Smoother()
        repeat(5) { follows.push(55.0) }
        repeat(2) { follows.push(73.4) }
        assertEquals(73.4, follows.push(73.4)!!, 0.05)
    }
}
