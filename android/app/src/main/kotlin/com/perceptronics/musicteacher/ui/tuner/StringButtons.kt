package com.perceptronics.musicteacher.ui.tuner

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.onClick
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.perceptronics.musicteacher.core.theory.Tuning
import com.perceptronics.musicteacher.core.theory.formatNote
import com.perceptronics.musicteacher.core.theory.parseNote
import com.perceptronics.musicteacher.i18n.LocalLocale
import com.perceptronics.musicteacher.i18n.t

/**
 * One button per open string, lowest first: lights up when heard, plays its pitch when tapped
 * (port of src/components/Tuner/StringButtons.tsx).
 */
@Composable
fun StringButtons(tuning: Tuning, active: Int?, onPlay: (Int) -> Unit) {
    val locale = LocalLocale.current
    val scheme = MaterialTheme.colorScheme
    val count = tuning.strings.size
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally)) {
        tuning.strings.forEachIndexed { i, s ->
            val name = formatNote(s, locale)
            val octave = parseNote(s)?.octave
            val isActive = i == active
            val label = t("tuner.playString", "note" to "$name${octave ?: ""}")
            val shape = RoundedCornerShape(12.dp)
            Column(
                Modifier
                    .weight(1f)
                    .widthIn(max = 76.dp)
                    .clip(shape)
                    .background(if (isActive) scheme.surface else scheme.surfaceVariant)
                    .border(BorderStroke(2.dp, if (isActive) scheme.primary else Color.Transparent), shape)
                    .clickable { onPlay(i) }
                    .clearAndSetSemantics {
                        contentDescription = label
                        role = Role.Button
                        selected = isActive
                        onClick {
                            onPlay(i)
                            true
                        }
                    }
                    .padding(vertical = 10.dp, horizontal = 4.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Row(verticalAlignment = Alignment.Bottom) {
                    Text(name, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, maxLines = 1)
                    if (octave != null) Text(octave.toString(), fontSize = 12.sp, color = scheme.onSurfaceVariant)
                }
                // Strings are numbered from the highest, as bassists count them.
                Text(
                    "${count - i}",
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = scheme.onSurfaceVariant,
                )
            }
        }
    }
}
