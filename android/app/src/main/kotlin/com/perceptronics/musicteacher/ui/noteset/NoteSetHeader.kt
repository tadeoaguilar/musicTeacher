package com.perceptronics.musicteacher.ui.noteset

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.perceptronics.musicteacher.i18n.t
import com.perceptronics.musicteacher.ui.theme.LocalNeckColors

// Port of src/components/NoteSet/NoteSetHeader.tsx.

/** The title for a scale or chord, with its notes and formula as chips (the first is the root). */
@Composable
fun NoteSetHeader(title: String, description: String, notes: List<String>, intervals: List<String>) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(title, style = MaterialTheme.typography.headlineMedium, modifier = Modifier.semantics { heading() })
        Text(
            description,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        ChipRow(t("scales.notes"), notes)
        ChipRow(t("scales.formula"), intervals)
    }
}

@Composable
private fun ChipRow(label: String, items: List<String>) {
    val root = LocalNeckColors.current.root
    Row(verticalAlignment = Alignment.CenterVertically) {
        // A minimum, not a fixed width: with large text, "Formula" grows instead of breaking mid-word.
        Text(
            label,
            style = MaterialTheme.typography.labelLarge,
            softWrap = false,
            modifier = Modifier.padding(end = 12.dp).widthIn(min = 72.dp),
        )
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            items.forEachIndexed { i, item ->
                Text(
                    item,
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Bold,
                    color = if (i == 0) Color.White else MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier
                        .background(
                            if (i ==
                                0
                            ) {
                                root
                            } else {
                                MaterialTheme.colorScheme.surfaceVariant
                            },
                            RoundedCornerShape(50),
                        )
                        .padding(horizontal = 10.dp, vertical = 4.dp),
                )
            }
        }
    }
}

/** Explains the fretboard markers: root, starting note and suggested fingering. */
@Composable
fun NeckLegend(intro: String, pathLabel: String) {
    val colors = LocalNeckColors.current
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(intro, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            LegendItem(t("scales.legend.root")) { Modifier.background(colors.root, CircleShape) }
            LegendItem(t("scales.legend.start")) { Modifier.border(2.dp, colors.root, CircleShape) }
            LegendItem(pathLabel) {
                Modifier.background(colors.note, CircleShape).border(2.dp, colors.path, CircleShape)
            }
        }
    }
}

@Composable
private fun LegendItem(label: String, swatch: () -> Modifier) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Box(Modifier.size(14.dp).then(swatch()))
        Text(label, style = MaterialTheme.typography.bodySmall)
    }
}
