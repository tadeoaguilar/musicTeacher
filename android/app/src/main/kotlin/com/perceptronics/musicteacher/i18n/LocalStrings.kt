package com.perceptronics.musicteacher.i18n

import android.content.Context
import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.core.os.LocaleListCompat
import com.perceptronics.musicteacher.core.theory.Locale

val LocalStrings = staticCompositionLocalOf<Strings> { error("No strings provided") }
val LocalLocale = staticCompositionLocalOf { Locale.EN }

/** Shorthand for `LocalStrings.current.t(...)` inside composables. */
@Composable
@ReadOnlyComposable
fun t(key: String, vararg args: Pair<String, Any>): String = LocalStrings.current.t(key, *args)

/** Spanish if the app (or, by default, the phone) is set to Spanish; English otherwise, like the web. */
fun localeOf(context: Context): Locale {
    val language = context.resources.configuration.locales[0].language
    return if (language == "es") Locale.ES else Locale.EN
}

/** Loads src/i18n/<lang>.json, copied into the app's assets at build time. */
fun loadStrings(context: Context, locale: Locale): Strings {
    val file = if (locale == Locale.ES) "es" else "en"
    return Strings.parse(context.assets.open("i18n/$file.json").bufferedReader().use { it.readText() })
}

/** Switches the app's language (Android recreates the screen and remembers the choice). */
fun setAppLocale(locale: Locale) {
    val tag = if (locale == Locale.ES) "es" else "en"
    AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(tag))
}
