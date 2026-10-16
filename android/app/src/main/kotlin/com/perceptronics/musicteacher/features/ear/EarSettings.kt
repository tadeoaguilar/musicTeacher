package com.perceptronics.musicteacher.features.ear

import com.perceptronics.musicteacher.core.ear.LEVELS
import com.perceptronics.musicteacher.core.ear.PlayMode
import com.perceptronics.musicteacher.features.neck.NeckSettings
import com.perceptronics.musicteacher.features.neck.Params
import com.perceptronics.musicteacher.features.neck.PlaybackSettings
import com.perceptronics.musicteacher.features.neck.neckFromParams
import com.perceptronics.musicteacher.features.neck.putNeck

// Port of src/features/ear/earState.ts.

/** The exercise tabs; `id` is the web's `ex` param value. */
enum class Exercise(val id: String) { NOTE("note"), INTERVAL("interval") }

data class EarSettings(
    /** Which exercise tab is open. */
    val exercise: Exercise = Exercise.NOTE,
    val level: Int = 1,
    val tuning: String = "4-standard",
    val frets: Int = 24,
    val leftHanded: Boolean = false,
    /** Show the note's name, or play it only (pure ear). */
    val showName: Boolean = true,
    /** Intervals: notes going up, down, together, or a mix. */
    val play: PlayMode = PlayMode.UP,
) {
    /** Leaves out defaults to keep the string short. */
    fun toParams(): Params {
        val p = Params()
        if (exercise != DEFAULT.exercise) p["ex"] = exercise.id
        if (level != DEFAULT.level) p["level"] = level.toString()
        if (!showName) p["name"] = "0"
        if (play != DEFAULT.play) p["play"] = play.id
        return p.putNeck(NeckSettings(tuning = tuning, frets = frets, leftHanded = leftHanded), PlaybackSettings())
    }

    companion object {
        val DEFAULT = EarSettings()

        /** Parses saved settings, ignoring anything invalid. */
        fun fromParams(p: Params): EarSettings {
            val neck = neckFromParams(p)
            return EarSettings(
                exercise = Exercise.entries.find { it.id == p["ex"] } ?: DEFAULT.exercise,
                level = p["level"]?.toIntOrNull()?.takeIf { it in LEVELS } ?: DEFAULT.level,
                tuning = neck.tuning,
                frets = neck.frets,
                leftHanded = neck.leftHanded,
                showName = p["name"] != "0",
                play = PlayMode.entries.find { it.id == p["play"] } ?: DEFAULT.play,
            )
        }
    }
}
