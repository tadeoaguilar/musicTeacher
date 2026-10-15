package com.perceptronics.musicteacher.core.pitch

import com.perceptronics.musicteacher.core.theory.KEY_IDS
import com.perceptronics.musicteacher.core.theory.Tuning
import com.perceptronics.musicteacher.core.theory.frequencyToMidi
import com.perceptronics.musicteacher.core.theory.noteMidi
import kotlin.math.floor
import kotlin.math.roundToInt

// Port of src/pitch/tuner.ts.

/** The lowest and highest pitches the tuner listens for: A0 (5-string drop A) up past C4. */
const val MIN_HZ = 27.0
const val MAX_HZ = 500.0

/** Within this many cents a note counts as in tune. */
const val IN_TUNE_CENTS = 5

data class NoteReading(
    /** Nearest note, e.g. 33 for A1. */
    val midi: Int,
    /** −50 to +50: how far the pitch is from that note; negative is flat. */
    val cents: Double,
    /** Spelled with an octave, e.g. "Bb0". */
    val name: String,
)

fun readNote(hz: Double, a4: Double = 440.0): NoteReading {
    val exact = frequencyToMidi(hz, a4)
    // Math.round semantics (halves up), like the web.
    val midi = floor(exact + 0.5).roundToInt()
    return NoteReading(midi, (exact - midi) * 100, "${KEY_IDS[midi.mod(12)]}${Math.floorDiv(midi, 12) - 1}")
}

/** Index of the open string tuned to this note (lowest string = 0), if any. */
fun matchString(midi: Int, tuning: Tuning): Int? =
    tuning.strings.indexOfFirst { noteMidi(it) == midi }.takeIf { it >= 0 }

private const val HISTORY = 5

/** A note shows only after this many readings, so one bad frame can't flash a wrong note. */
private const val MIN_READINGS = 3

/** A plucked note fades in and out of detection; hold it through this many missed readings. */
private const val HOLD = 6

/**
 * Steadies raw detections: the median of the last few readings ignores the odd
 * wrong-octave frame, and the note is held briefly through dropouts so the
 * needle doesn't flicker.
 */
class Smoother {
    private var history = listOf<Double>()
    private var missed = 0

    fun push(hz: Double?): Double? {
        if (hz == null) {
            if (++missed > HOLD) history = emptyList()
        } else {
            missed = 0
            history = history.takeLast(HISTORY - 1) + hz
        }
        return if (history.size >= MIN_READINGS) history.sorted()[history.size / 2] else null
    }

    fun reset() {
        history = emptyList()
        missed = 0
    }
}
