package com.perceptronics.musicteacher.core.pitch

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.log2
import kotlin.math.sin
import kotlin.test.Test
import kotlin.test.assertTrue

/**
 * Not a port: checks the tuner's whole path (48 kHz window → ~12 kHz → YIN) reads in-tune
 * open strings as in tune, so a tuning error on a phone points at the input, not the math.
 */
class DetectAccuracyTest {
    @Test
    fun readsInTuneOpenStringsWithinATenthOfACent() {
        val rate = 48000
        for (hz in listOf(41.2034, 55.0, 73.4162, 97.9989)) {
            val window = FloatArray(8192) { i ->
                var v = 0.0
                for (h in 1..6) v += sin(2 * PI * hz * h * i / rate) / h
                (0.2 * v).toFloat()
            }
            val pitch = detectPitch(downsample(window, 4), rate / 4.0, DetectOptions(MIN_HZ, MAX_HZ))
            val cents = 1200 * log2(pitch!!.hz / hz)
            assertTrue(abs(cents) < 0.1, "$hz Hz read $cents cents off")
        }
    }
}
