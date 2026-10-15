package com.perceptronics.musicteacher.core.theory

// Port of src/theory/fretboard.ts.

/** A spot on the neck. String 0 is the lowest string. */
interface Position {
    val string: Int
    val fret: Int
}

data class FretPosition(override val string: Int, override val fret: Int) : Position

data class FretNote(
    override val string: Int,
    override val fret: Int,
    val midi: Int,
    /** Key-correct spelling, e.g. "Bb". */
    val name: String,
    /** Interval label from the tonic, e.g. "b3". */
    val interval: String,
    /** Position in the scale or chord, 1-based. */
    val degree: Int,
    val isRoot: Boolean,
    /** The lowest root on the neck: where to start playing the scale. */
    val isStart: Boolean,
) : Position

/** Identifies a spot on the neck, e.g. "0-5" for string 0, fret 5. */
fun positionKey(p: Position) = "${p.string}-${p.fret}"

fun openStringMidi(tuning: Tuning): List<Int> = tuning.strings.map(::noteMidi)

/** Every note of a scale or chord on the neck, ordered by string then fret. */
fun getFretboardNotes(tuning: Tuning, fretCount: Int, scale: NoteSet): List<FretNote> {
    val tonicChroma = noteChroma(scale.tonic)
    val degreeBySemitone = scale.semitones.withIndex().associate { (i, st) -> st to i }

    val notes = mutableListOf<FretNote>()
    openStringMidi(tuning).forEachIndexed { string, openMidi ->
        for (fret in 0..fretCount) {
            val midi = openMidi + fret
            val i = degreeBySemitone[(midi - tonicChroma).mod(12)] ?: continue
            notes += FretNote(string, fret, midi, scale.notes[i], scale.intervals[i], i + 1, i == 0, false)
        }
    }

    // Lowest root by pitch; on a tie prefer the thicker string (e.g. A on E string fret 5).
    val start = notes.filter { it.isRoot }.reduceOrNull { best, n ->
        if (n.midi < best.midi || (n.midi == best.midi && n.string < best.string)) n else best
    } ?: return notes
    return notes.map { if (it === start) it.copy(isStart = true) else it }
}
