package com.perceptronics.musicteacher.core.theory

// Port of src/theory/scales.ts.

/** Semitones above the tonic for each degree. */
private val FORMULAS: Map<String, List<Int>> = linkedMapOf(
    "major" to listOf(0, 2, 4, 5, 7, 9, 11),
    "minor" to listOf(0, 2, 3, 5, 7, 8, 10),
    "ionian" to listOf(0, 2, 4, 5, 7, 9, 11),
    "dorian" to listOf(0, 2, 3, 5, 7, 9, 10),
    "phrygian" to listOf(0, 1, 3, 5, 7, 8, 10),
    "lydian" to listOf(0, 2, 4, 6, 7, 9, 11),
    "mixolydian" to listOf(0, 2, 4, 5, 7, 9, 10),
    "aeolian" to listOf(0, 2, 3, 5, 7, 8, 10),
    "locrian" to listOf(0, 1, 3, 5, 6, 8, 10),
)

val SCALE_IDS: List<String> = FORMULAS.keys.toList()

fun isScaleId(value: String) = value in FORMULAS

/** The 12 selectable keys, identified by a canonical name. Spelling is resolved per scale. */
val KEY_IDS = listOf("C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B")

fun isKeyId(value: String) = value in KEY_IDS

/** Enharmonic spellings to try for each key. The first one wins on ties. */
private val KEY_SPELLINGS = mapOf(
    "C" to listOf("C"),
    "C#" to listOf("C#", "Db"),
    "D" to listOf("D"),
    "Eb" to listOf("Eb", "D#"),
    "E" to listOf("E"),
    "F" to listOf("F"),
    "F#" to listOf("F#", "Gb"),
    "G" to listOf("G"),
    "Ab" to listOf("Ab", "G#"),
    "A" to listOf("A"),
    "Bb" to listOf("Bb", "A#"),
    "B" to listOf("B"),
)

/** All spellings of a key, e.g. "C#" → ["C#", "Db"]. */
fun keySpellings(key: String): List<String> = KEY_SPELLINGS.getValue(key)

/** Which notes make up a scale or chord, relative to its root. */
interface NoteSetFormula {
    /** Semitones above the root for each tone. */
    val semitones: List<Int>

    /**
     * Letter steps above the root for each tone (0 = root, 2 = third, 6 = seventh).
     * They decide the spelling: a diminished 7th is Bbb in C, not A.
     */
    val degrees: List<Int>
}

data class Formula(override val semitones: List<Int>, override val degrees: List<Int>) : NoteSetFormula

data class NoteSet(
    val tonic: String,
    /** Note names in order, e.g. ["D","E","F","G","A","B","C"] or ["G","B","D","F"]. */
    val notes: List<String>,
    /** Interval labels relative to the major scale, e.g. ["R","2","b3"] or ["R","3","5","b7"]. */
    val intervals: List<String>,
    /** Semitones above the tonic for each tone. */
    val semitones: List<Int>,
)

private val MAJOR = FORMULAS.getValue("major")
private val SCALE_DEGREES = listOf(0, 1, 2, 3, 4, 5, 6)

private fun intervalLabels(formula: NoteSetFormula): List<String> = formula.semitones.mapIndexed { i, st ->
    if (i == 0) return@mapIndexed "R"
    val degree = formula.degrees[i]
    val diff = st - MAJOR[degree]
    (if (diff < 0) "b".repeat(-diff) else "#".repeat(diff)) + (degree + 1)
}

private fun spellNotes(tonic: String, formula: NoteSetFormula): List<String> {
    val start = LETTERS.indexOf(parseNote(tonic)!!.letter)
    val tonicChroma = noteChroma(tonic)
    return formula.semitones.mapIndexed { i, st ->
        spell(
            LETTERS[(start + formula.degrees[i]) % 7],
            (tonicChroma + st) % 12,
        )
    }
}

private fun accidentalCount(notes: List<String>) = notes.sumOf { parseNote(it)!!.acc.length }

/**
 * Resolves a key + formula into correctly spelled notes, picking the
 * enharmonic tonic that needs the fewest accidentals (Db major, C# minor).
 */
fun resolveNoteSet(key: String, formula: NoteSetFormula): NoteSet {
    val (tonic, notes) = KEY_SPELLINGS.getValue(key)
        .map { it to spellNotes(it, formula) }
        .reduce { best, candidate ->
            if (accidentalCount(candidate.second) <
                accidentalCount(best.second)
            ) {
                candidate
            } else {
                best
            }
        }
    return NoteSet(tonic, notes, intervalLabels(formula), formula.semitones)
}

/** A scale uses each letter once, so its spelling never repeats a letter name. */
fun resolveScale(key: String, scaleId: String): NoteSet =
    resolveNoteSet(key, Formula(FORMULAS.getValue(scaleId), SCALE_DEGREES))
