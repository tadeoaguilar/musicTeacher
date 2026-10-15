package com.perceptronics.musicteacher.audio

// Port of src/audio/AudioEngine.ts. The Oboe implementation (the recorded bass) arrives in phase 3.

class SequenceOptions(
    val bpm: Int,
    val loop: Boolean,
    /** Called in sync with the sound: the index of the note now playing, or null when finished. */
    val onNote: (Int?) -> Unit,
)

class NoteOptions(
    /** Reference pitch in Hz. */
    val a4: Double = 440.0,
    /** Seconds; a short pluck if null. */
    val duration: Double? = null,
    /** Seconds from now, scheduled on the audio clock (e.g. the second note of an interval). */
    val delay: Double = 0.0,
)

/** Everything the screens need from audio, so they never depend on how it's produced. */
interface AudioEngine {
    fun playNote(midi: Int, options: NoteOptions = NoteOptions())

    fun playSequence(midis: List<Int>, options: SequenceOptions)

    fun setBpm(bpm: Int)

    fun stop()
}
