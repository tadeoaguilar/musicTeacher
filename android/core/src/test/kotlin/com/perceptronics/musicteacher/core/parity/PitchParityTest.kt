package com.perceptronics.musicteacher.core.parity

import com.perceptronics.musicteacher.core.pitch.DetectOptions
import com.perceptronics.musicteacher.core.pitch.MAX_HZ
import com.perceptronics.musicteacher.core.pitch.MIN_HZ
import com.perceptronics.musicteacher.core.pitch.Smoother
import com.perceptronics.musicteacher.core.pitch.detectPitch
import com.perceptronics.musicteacher.core.pitch.downsample
import com.perceptronics.musicteacher.core.pitch.matchString
import com.perceptronics.musicteacher.core.pitch.readNote
import com.perceptronics.musicteacher.core.pitch.rms
import com.perceptronics.musicteacher.core.theory.getTuning
import kotlin.test.Test
import kotlin.test.assertEquals

/**
 * src/pitch against the web app's results (fixtures/pitch.json). The detector gets the exact
 * samples the web detector saw, so pitch and clarity must agree to the last bit.
 */
class PitchParityTest {
    private val f = Fixtures.load("pitch")

    @Test
    fun downsampling() {
        val input = f["downsample"]["input"].array.map { it.double.toFloat() }.toFloatArray()
        f["downsample"]["factors"].ints().zip(f["downsampled"].array).forEach { (factor, expected) ->
            assertEquals(
                expected.array.map {
                    it.double.toFloat()
                },
                downsample(input, factor).toList(),
                "factor $factor",
            )
        }
    }

    @Test
    fun detections() {
        for (d in f["detections"].array) {
            val name = d["name"].str
            val input = d["input"].array.map { it.double.toFloat() }.toFloatArray()
            assertClose(d["rms"].double, rms(input), name)
            val pitch = detectPitch(input, 12000.0, DetectOptions(MIN_HZ, MAX_HZ))
            assertEquals(d["hz"].doubleOrNull(), pitch?.hz, name)
            assertEquals(d["clarity"].doubleOrNull(), pitch?.clarity, name)
        }
    }

    @Test
    fun readingsStringsAndSmoothing() {
        for (r in f["readings"].array) {
            val reading = readNote(r["hz"].double, r["a4"].double)
            assertEquals(r["midi"].int, reading.midi)
            assertEquals(r["name"].str, reading.name)
            assertClose(r["cents"].double, reading.cents)
        }
        for (row in f["strings"].array) {
            assertEquals(
                row[2].intOrNull(),
                matchString(row[1].int, getTuning(row[0].str)!!),
                "${row[0].str} ${row[1].int}",
            )
        }
        val smoother = Smoother()
        for (row in f["smoothed"].array) assertEquals(row[1].doubleOrNull(), smoother.push(row[0].doubleOrNull()))
    }
}
