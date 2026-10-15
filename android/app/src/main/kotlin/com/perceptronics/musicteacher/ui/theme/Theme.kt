package com.perceptronics.musicteacher.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// The color tokens from src/index.css, light and dark, so both apps look alike.

private val Light = lightColorScheme(
    primary = Color(0xFF1F3A5F), // --accent
    onPrimary = Color(0xFFFFFFFF), // --on-accent
    secondary = Color(0xFFE8590C), // --root
    onSecondary = Color(0xFFFFFFFF),
    background = Color(0xFFF5F3EE), // --bg
    onBackground = Color(0xFF1C1E22), // --text
    surface = Color(0xFFFFFFFF), // --surface
    onSurface = Color(0xFF1C1E22),
    surfaceVariant = Color(0xFFECE8E0), // --control-bg
    onSurfaceVariant = Color(0xFF646A73), // --muted
    surfaceContainer = Color(0xFFFFFFFF),
    secondaryContainer = Color(0xFFECE8E0),
    onSecondaryContainer = Color(0xFF1C1E22),
    outline = Color(0xFFE2DDD3), // --border
    error = Color(0xFFC92A2A), // --wrong
)

private val Dark = darkColorScheme(
    primary = Color(0xFF7FB0FF),
    onPrimary = Color(0xFF0F1A2B),
    secondary = Color(0xFFFF7A2F),
    onSecondary = Color(0xFF121418),
    background = Color(0xFF121418),
    onBackground = Color(0xFFEBE8E2),
    surface = Color(0xFF1A1D22),
    onSurface = Color(0xFFEBE8E2),
    surfaceVariant = Color(0xFF242930),
    onSurfaceVariant = Color(0xFF9AA1AB),
    surfaceContainer = Color(0xFF1A1D22),
    secondaryContainer = Color(0xFF242930),
    onSecondaryContainer = Color(0xFFEBE8E2),
    outline = Color(0xFF2B3038),
    error = Color(0xFFFF6B6B),
)

@Composable
fun BassicallyTheme(dark: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = if (dark) Dark else Light, content = content)
}
