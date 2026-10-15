package com.perceptronics.musicteacher.core.ear

import com.perceptronics.musicteacher.core.theory.FretPosition
import com.perceptronics.musicteacher.core.theory.KEY_IDS
import com.perceptronics.musicteacher.core.theory.Tuning
import com.perceptronics.musicteacher.core.theory.openStringMidi

// Port of src/ear/findNote.ts.

val LEVELS = listOf(1, 2, 3)

data class FindNoteOptions(
    val tuning: Tuning,
    /** Frets on the bass; level 3 uses all of them. */
    val frets: Int,
    val level: Int,
)

data class FindNoteQuestion(
    val midi: Int,
    /** Pitch class, spelled as a key: "C#" covers C♯/D♭. */
    val pitchClass: String,
)

/** The highest fret a level asks about. */
fun maxFretFor(level: Int, frets: Int): Int = minOf(
    frets,
    if (level == 1) {
        5
    } else if (level == 2) {
        12
    } else {
        frets
    },
)

private val NATURAL = setOf(0, 2, 4, 5, 7, 9, 11)

fun pitchClassOf(midi: Int): String = KEY_IDS[midi.mod(12)]

/** Every pitch the level can ask for: playable within its frets, natural notes only on level 1. */
fun candidates(options: FindNoteOptions): List<Int> {
    val maxFret = maxFretFor(options.level, options.frets)
    val midis = linkedSetOf<Int>()
    for (open in openStringMidi(options.tuning)) {
        for (fret in 0..maxFret) midis += open + fret
    }
    return midis.filter { options.level > 1 || it.mod(12) in NATURAL }.sorted()
}

/**
 * A new question, never the same pitch twice in a row. Notes you miss come up
 * more often: the weight is per pitch class, since that's what you learn.
 */
fun nextQuestion(
    options: FindNoteOptions,
    random: Random,
    stats: ItemStats = emptyMap(),
    previous: FindNoteQuestion? = null,
): FindNoteQuestion {
    val pool = candidates(options).filter { it != previous?.midi }
    val midi = pickWeighted(pool, { weightOf(stats, pitchClassOf(it)) }, random)
    return FindNoteQuestion(midi, pitchClassOf(midi))
}

/** Where a pitch is on the neck, up to maxFret. */
fun positionsOf(midi: Int, tuning: Tuning, maxFret: Int): List<FretPosition> =
    openStringMidi(tuning).mapIndexedNotNull { string, open ->
        val fret = midi - open
        if (fret in 0..maxFret) FretPosition(string, fret) else null
    }

/** Where the same note sounds in other octaves, up to maxFret. */
fun otherOctaves(midi: Int, tuning: Tuning, maxFret: Int): List<FretPosition> =
    openStringMidi(tuning).flatMapIndexed { string, open ->
        (0..maxFret).filter { fret -> open + fret != midi && (open + fret - midi) % 12 == 0 }
            .map { FretPosition(string, it) }
    }

/**
 * EXACT: the pitch you heard. HIGHER / LOWER: the right note in another
 * octave (still correct: you found the note; the octave is the ear part).
 */
enum class Verdict(val id: String) { EXACT("exact"), HIGHER("higher"), LOWER("lower"), WRONG("wrong") }

fun judge(question: FindNoteQuestion, tappedMidi: Int): Verdict = when {
    tappedMidi == question.midi -> Verdict.EXACT
    (tappedMidi - question.midi) % 12 != 0 -> Verdict.WRONG
    tappedMidi > question.midi -> Verdict.HIGHER
    else -> Verdict.LOWER
}

fun isCorrect(verdict: Verdict) = verdict != Verdict.WRONG
