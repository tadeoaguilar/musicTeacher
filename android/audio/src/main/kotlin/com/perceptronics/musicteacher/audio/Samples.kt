package com.perceptronics.musicteacher.audio

import com.perceptronics.musicteacher.core.theory.noteMidi

// Port of src/audio/samples.ts, for the WAV copies in src/main/assets/samples/bass.

private val SAMPLE_NAME = Regex("(?:^|/)([A-G])(s?)(-?\\d)\\.wav$")

/**
 * MIDI number of a sample file such as "As1.wav" (A#1 → 34). File names use `s` for sharp
 * because `#` is awkward in paths. Null for anything else.
 */
fun sampleMidi(path: String): Int? {
    val (letter, sharp, octave) = SAMPLE_NAME.find(path)?.destructured ?: return null
    return noteMidi(letter + (if (sharp.isNotEmpty()) "#" else "") + octave)
}

/** Where the recorded bass lives inside the APK. */
const val SAMPLES_DIR = "samples/bass"
