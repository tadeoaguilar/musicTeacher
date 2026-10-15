package com.perceptronics.musicteacher.core.theory

// Port of src/theory/chords.ts.

enum class ChordGroup { TRIAD, SEVENTH, SIXTH }

data class Chord(
    override val semitones: List<Int>,
    override val degrees: List<Int>,
    /** Suffix after the root in a chord symbol, e.g. "m7b5" in Bm7b5. */
    val symbol: String,
    val group: ChordGroup,
) : NoteSetFormula

private val TRIAD = listOf(0, 2, 4)
private val SEVENTH = listOf(0, 2, 4, 6)
private val SIXTH = listOf(0, 2, 4, 5)

/** Chord tones, in the order an arpeggio plays them. */
private val CHORDS: Map<String, Chord> = linkedMapOf(
    "maj" to Chord(listOf(0, 4, 7), TRIAD, "", ChordGroup.TRIAD),
    "min" to Chord(listOf(0, 3, 7), TRIAD, "m", ChordGroup.TRIAD),
    "dim" to Chord(listOf(0, 3, 6), TRIAD, "°", ChordGroup.TRIAD),
    "aug" to Chord(listOf(0, 4, 8), TRIAD, "+", ChordGroup.TRIAD),
    "sus4" to Chord(listOf(0, 5, 7), listOf(0, 3, 4), "sus4", ChordGroup.TRIAD),
    "maj7" to Chord(listOf(0, 4, 7, 11), SEVENTH, "maj7", ChordGroup.SEVENTH),
    "dom7" to Chord(listOf(0, 4, 7, 10), SEVENTH, "7", ChordGroup.SEVENTH),
    "m7" to Chord(listOf(0, 3, 7, 10), SEVENTH, "m7", ChordGroup.SEVENTH),
    "m7b5" to Chord(listOf(0, 3, 6, 10), SEVENTH, "m7b5", ChordGroup.SEVENTH),
    "dim7" to Chord(listOf(0, 3, 6, 9), SEVENTH, "°7", ChordGroup.SEVENTH),
    "maj6" to Chord(listOf(0, 4, 7, 9), SIXTH, "6", ChordGroup.SIXTH),
    "m6" to Chord(listOf(0, 3, 7, 9), SIXTH, "m6", ChordGroup.SIXTH),
)

val CHORD_IDS: List<String> = CHORDS.keys.toList()

fun isChordId(value: String) = value in CHORDS

fun getChord(id: String): Chord = CHORDS.getValue(id)
