package com.perceptronics.musicteacher.features.pro

import androidx.compose.runtime.Composable
import com.perceptronics.musicteacher.core.access.Access
import com.perceptronics.musicteacher.ui.pro.Paywall
import com.perceptronics.musicteacher.ui.pro.ProTeaser

// Port of src/features/pro/ProSlot.tsx.

/**
 * Where a Pro feature goes on a screen. Locked: a teaser that opens the paywall. Hidden: nothing.
 * Open: the feature itself, once it exists (Phase 5 of docs/MONETIZATION.md); nothing for now.
 */
@Composable
fun ProSlot(feature: String) {
    val access = LocalAccess.current
    if (access.accessTo(feature) == Access.LOCKED) ProTeaser(feature) { access.paywallOpen = true }
}

/** The one paywall, mounted in the app shell. */
@Composable
fun PaywallHost() {
    val access = LocalAccess.current
    if (access.paywallOpen) Paywall(access.visibleProFeatures()) { access.paywallOpen = false }
}
