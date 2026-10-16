package com.perceptronics.musicteacher.features.tuner

import com.perceptronics.musicteacher.core.theory.getTuning
import com.perceptronics.musicteacher.features.neck.Params

// Port of src/features/tuner/tunerState.ts.

const val A4_MIN = 432
const val A4_MAX = 446

data class TunerSettings(
    val tuning: String = "4-standard",
    /** Reference pitch in Hz. */
    val a4: Int = 440,
) {
    /** Leaves out defaults to keep the string short. */
    fun toParams(): Params {
        val p = Params()
        if (tuning != DEFAULT.tuning) p["tuning"] = tuning
        if (a4 != DEFAULT.a4) p["a4"] = a4.toString()
        return p
    }

    companion object {
        val DEFAULT = TunerSettings()

        /** Parses saved settings, ignoring anything invalid. */
        fun fromParams(p: Params): TunerSettings {
            var s = DEFAULT
            p["tuning"]?.let { if (getTuning(it) != null) s = s.copy(tuning = it) }
            p["a4"]?.trim()?.toDoubleOrNull()?.let {
                if (it % 1.0 == 0.0 && it >= A4_MIN && it <= A4_MAX) s = s.copy(a4 = it.toInt())
            }
            return s
        }
    }
}
