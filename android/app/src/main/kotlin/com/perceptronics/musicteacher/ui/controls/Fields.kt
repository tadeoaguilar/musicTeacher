package com.perceptronics.musicteacher.ui.controls

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.selection.toggleable
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedIconButton
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.perceptronics.musicteacher.R
import kotlin.math.roundToInt

// The web's form fields (src/components/Controls/fields.tsx) in Material 3.

/** A choice in a field; `group` starts a labelled section in a dropdown. */
data class Option<T>(val value: T, val label: String, val group: String? = null)

/** A card holding a column of fields, like the web's `.panel`. */
@Composable
fun Panel(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp), content = content)
    }
}

@Composable
private fun Field(label: String, content: @Composable () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(label, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
        content()
    }
}

/** A few options side by side. */
@Composable
fun <T> Segmented(label: String, value: T, options: List<Option<T>>, onChange: (T) -> Unit) {
    Field(label) {
        SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth().semantics { contentDescription = label }) {
            options.forEachIndexed { i, option ->
                SegmentedButton(
                    selected = option.value == value,
                    onClick = { onChange(option.value) },
                    shape = SegmentedButtonDefaults.itemShape(i, options.size),
                    colors = SegmentedButtonDefaults.colors(
                        activeContainerColor = MaterialTheme.colorScheme.primary,
                        activeContentColor = MaterialTheme.colorScheme.onPrimary,
                    ),
                    icon = {},
                ) { Text(option.label, textAlign = TextAlign.Center) }
            }
        }
    }
}

/** Many short options that wrap onto several lines (the 12 keys). */
@Composable
fun <T> Chips(label: String, value: T, options: List<Option<T>>, onChange: (T) -> Unit) {
    Field(label) {
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            options.forEach { option ->
                FilterChip(
                    selected = option.value == value,
                    onClick = { onChange(option.value) },
                    label = { Text(option.label) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = MaterialTheme.colorScheme.primary,
                        selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                    ),
                )
            }
        }
    }
}

/** A long list of options in a menu, optionally in labelled groups. */
@Composable
fun <T> Dropdown(label: String, value: T, options: List<Option<T>>, onChange: (T) -> Unit) {
    var open by remember { mutableStateOf(false) }
    Field(label) {
        Box {
            OutlinedButton(
                onClick = { open = true },
                modifier = Modifier.fillMaxWidth().semantics { contentDescription = label },
            ) {
                Text(
                    options.find { it.value == value }?.label ?: "",
                    modifier = Modifier.weight(1f),
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Icon(painterResource(R.drawable.ic_expand_more), contentDescription = null)
            }
            DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
                options.forEachIndexed { i, option ->
                    if (option.group != null && option.group != options.getOrNull(i - 1)?.group) {
                        Text(
                            option.group,
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.secondary,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                        )
                    }
                    DropdownMenuItem(
                        text = { Text(option.label) },
                        onClick = {
                            open = false
                            onChange(option.value)
                        },
                    )
                }
            }
        }
    }
}

/** An on/off setting: the whole row is tappable. */
@Composable
fun Toggle(label: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    Row(
        Modifier.fillMaxWidth().toggleable(checked, role = Role.Switch, onValueChange = onChange),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
        Switch(checked = checked, onCheckedChange = null)
    }
}

/** A labelled slider showing its value as text ("60 %", "Straight"). */
@Composable
fun LabeledSlider(
    label: String,
    display: String,
    value: Int,
    range: IntRange,
    onChange: (Int) -> Unit,
    enabled: Boolean = true,
) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(
            "$label · $display",
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Slider(
            value = value.toFloat(),
            onValueChange = { onChange(it.roundToInt()) },
            valueRange = range.first.toFloat()..range.last.toFloat(),
            enabled = enabled,
            modifier = Modifier.semantics {
                contentDescription = label
                stateDescription = display
            },
        )
    }
}

/** A whole number in a range, nudged with − and + (the web's number input, easier to hit on a phone). */
@Composable
fun Stepper(label: String, value: Int, range: IntRange, onChange: (Int) -> Unit, enabled: Boolean = true) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(label, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Row(verticalAlignment = Alignment.CenterVertically) {
            OutlinedIconButton(
                onClick = { onChange((value - 1).coerceIn(range)) },
                enabled = enabled && value > range.first,
                modifier = Modifier.semantics { contentDescription = "$label −1" },
            ) { Text("−", style = MaterialTheme.typography.titleLarge) }
            Text(
                value.toString(),
                style = MaterialTheme.typography.titleLarge,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.run { if (enabled) onSurface else onSurfaceVariant },
                modifier = Modifier.width(56.dp).semantics { contentDescription = "$label: $value" },
            )
            OutlinedIconButton(
                onClick = { onChange((value + 1).coerceIn(range)) },
                enabled = enabled && value < range.last,
                modifier = Modifier.semantics { contentDescription = "$label +1" },
            ) { Text("+", style = MaterialTheme.typography.titleLarge) }
        }
    }
}
