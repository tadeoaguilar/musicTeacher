package com.perceptronics.musicteacher

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.remember
import com.perceptronics.musicteacher.audio.BassAudio
import com.perceptronics.musicteacher.i18n.LocalLocale
import com.perceptronics.musicteacher.i18n.LocalStrings
import com.perceptronics.musicteacher.i18n.loadStrings
import com.perceptronics.musicteacher.i18n.localeOf
import com.perceptronics.musicteacher.ui.theme.BassicallyTheme

/** AppCompat (not plain ComponentActivity) for the per-app language switch. */
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val locale = localeOf(this)
        setContent {
            val strings = remember(locale) { loadStrings(this, locale) }
            CompositionLocalProvider(LocalStrings provides strings, LocalLocale provides locale) {
                BassicallyTheme { AppShell() }
            }
        }
    }

    // The audio device is held only while the app is visible.
    override fun onStart() {
        super.onStart()
        BassAudio.start(this)
    }

    override fun onStop() {
        super.onStop()
        BassAudio.stop()
    }
}
