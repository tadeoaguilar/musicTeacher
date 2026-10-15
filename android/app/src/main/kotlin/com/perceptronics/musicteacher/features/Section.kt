package com.perceptronics.musicteacher.features

import androidx.annotation.DrawableRes
import com.perceptronics.musicteacher.R

/** The app's sections, in the web app's order (SECTIONS in src/app/Layout.tsx); `id` is the web route. */
enum class Section(val id: String, @param:DrawableRes val icon: Int) {
    SCALES("scales", R.drawable.ic_scales),
    ARPEGGIOS("arpeggios", R.drawable.ic_arpeggios),
    EAR("ear", R.drawable.ic_ear),
    METRONOME("metronome", R.drawable.ic_metronome),
    TUNER("tuner", R.drawable.ic_tuner),
}
