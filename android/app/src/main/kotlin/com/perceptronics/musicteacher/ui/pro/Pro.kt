package com.perceptronics.musicteacher.ui.pro

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.perceptronics.musicteacher.i18n.t
import com.perceptronics.musicteacher.ui.controls.Panel

// Port of src/components/Pro.

/** Marks something as part of Bassically Pro. */
@Composable
fun ProBadge() {
    val scheme = MaterialTheme.colorScheme
    Text(
        t("pro.badge").uppercase(),
        color = scheme.onPrimary,
        fontSize = 11.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = 0.6.sp,
        modifier = Modifier
            .background(scheme.primary, RoundedCornerShape(50))
            .padding(horizontal = 8.dp, vertical = 2.dp),
    )
}

/** A locked Pro feature on a screen: what it is, and a button to the paywall. */
@Composable
fun ProTeaser(feature: String, onLearnMore: () -> Unit) {
    Panel {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(
                t("pro.features.$feature.title"),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.semantics { heading() },
            )
            ProBadge()
        }
        Text(
            t("pro.features.$feature.description"),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Button(onClick = onLearnMore) { Text(t("pro.learnMore")) }
    }
}

/** What Bassically Pro includes. Billing isn't built yet, so it says "coming soon" instead of offering plans. */
@Composable
fun Paywall(features: List<String>, onClose: () -> Unit) {
    AlertDialog(
        onDismissRequest = onClose,
        confirmButton = { TextButton(onClick = onClose) { Text(t("pro.close")) } },
        title = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                ProBadge()
                Text(t("pro.title"))
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(t("pro.intro"))
                features.forEach { id ->
                    Column {
                        Text(t("pro.features.$id.title"), fontWeight = FontWeight.Bold)
                        Text(t("pro.features.$id.description"), color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                Text(t("pro.comingSoon"), fontWeight = FontWeight.SemiBold)
            }
        },
    )
}
