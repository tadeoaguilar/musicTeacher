package com.perceptronics.musicteacher.features.scales

import com.perceptronics.musicteacher.core.theory.isKeyId
import com.perceptronics.musicteacher.core.theory.isScaleId
import com.perceptronics.musicteacher.features.neck.NeckSettings
import com.perceptronics.musicteacher.features.neck.Params
import com.perceptronics.musicteacher.features.neck.PlaybackSettings
import com.perceptronics.musicteacher.features.neck.neckFromParams
import com.perceptronics.musicteacher.features.neck.playbackFromParams
import com.perceptronics.musicteacher.features.neck.putNeck

// Port of src/features/scales/scaleState.ts.

data class ScaleSettings(
    val key: String = "C",
    val scale: String = "major",
    val neck: NeckSettings = NeckSettings(),
    val playback: PlaybackSettings = PlaybackSettings(),
) {
    fun toParams(): Params {
        val p = Params()
        p["key"] = key
        p["scale"] = scale
        return p.putNeck(neck, playback)
    }

    companion object {
        /** Parses saved settings, ignoring anything invalid. */
        fun fromParams(p: Params) = ScaleSettings(
            key = p["key"]?.takeIf(::isKeyId) ?: "C",
            scale = p["scale"]?.takeIf(::isScaleId) ?: "major",
            neck = neckFromParams(p),
            playback = playbackFromParams(p),
        )
    }
}
