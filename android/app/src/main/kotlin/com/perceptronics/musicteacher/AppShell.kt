package com.perceptronics.musicteacher

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.TextAutoSize
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.perceptronics.musicteacher.core.theory.Locale
import com.perceptronics.musicteacher.features.Section
import com.perceptronics.musicteacher.features.arpeggios.ArpeggiosScreen
import com.perceptronics.musicteacher.features.ear.EarScreen
import com.perceptronics.musicteacher.features.metronome.MetronomeScreen
import com.perceptronics.musicteacher.features.pro.PaywallHost
import com.perceptronics.musicteacher.features.scales.ScalesScreen
import com.perceptronics.musicteacher.features.tuner.TunerScreen
import com.perceptronics.musicteacher.i18n.LocalLocale
import com.perceptronics.musicteacher.i18n.setAppLocale
import com.perceptronics.musicteacher.i18n.t

/** Wider than this (tablets, phones in landscape), the sections move to a side rail. */
private const val RAIL_MIN_WIDTH_DP = 600

/** Content stops growing here, so lines and controls stay readable on tablets. */
private val CONTENT_MAX_WIDTH = 840.dp

/**
 * The app frame: title and language switch on top, the five sections in a bottom bar, or
 * in a side rail on wide screens.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppShell() {
    val nav = rememberNavController()
    val current by nav.currentBackStackEntryAsState()
    val route = current?.destination?.route
    val wide = LocalConfiguration.current.screenWidthDp >= RAIL_MIN_WIDTH_DP
    val go = { section: Section ->
        nav.navigate(section.id) {
            // Standard navigation-bar behavior: one copy of each section, state kept.
            popUpTo(nav.graph.findStartDestination().id) { saveState = true }
            launchSingleTop = true
            restoreState = true
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.app_name)) },
                actions = { LanguageSwitch(Modifier.padding(end = 12.dp)) },
            )
        },
        bottomBar = {
            if (!wide) {
                NavigationBar {
                    Section.entries.forEach { section ->
                        NavigationBarItem(
                            selected = route == section.id,
                            onClick = { go(section) },
                            icon = { Icon(painterResource(section.icon), contentDescription = null) },
                            label = { SectionLabel(section) },
                        )
                    }
                }
            }
        },
    ) { padding ->
        Row(Modifier.padding(padding)) {
            if (wide) {
                NavigationRail {
                    // Five items don't fit the height of a phone in landscape: let the rail scroll.
                    Column(Modifier.verticalScroll(rememberScrollState())) {
                        Section.entries.forEach { section ->
                            NavigationRailItem(
                                selected = route == section.id,
                                onClick = { go(section) },
                                icon = { Icon(painterResource(section.icon), contentDescription = null) },
                                label = { SectionLabel(section) },
                            )
                        }
                    }
                }
            }
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
                NavHost(
                    nav,
                    startDestination = Section.SCALES.id,
                    modifier = Modifier.widthIn(max = CONTENT_MAX_WIDTH).fillMaxSize(),
                ) {
                    Section.entries.forEach { section ->
                        composable(section.id) {
                            when (section) {
                                Section.SCALES -> ScalesScreen()
                                Section.ARPEGGIOS -> ArpeggiosScreen()
                                Section.METRONOME -> MetronomeScreen()
                                Section.EAR -> EarScreen()
                                Section.TUNER -> TunerScreen()
                            }
                        }
                    }
                }
            }
        }
    }
    PaywallHost()
}

/**
 * Long names ("Metrónomo") shrink to fit instead of being cut off. The bar's width is fixed,
 * so with a large text size they may shrink down to 9 dp, whatever the setting.
 */
@Composable
private fun SectionLabel(section: Section) {
    val fontScale = LocalDensity.current.fontScale
    Text(
        t("app.nav.${section.id}"),
        maxLines = 1,
        autoSize = TextAutoSize.StepBased(minFontSize = (9 / fontScale).sp, maxFontSize = 12.sp),
    )
}

@Composable
private fun LanguageSwitch(modifier: Modifier = Modifier) {
    val locale = LocalLocale.current
    val label = t("app.language")
    SingleChoiceSegmentedButtonRow(modifier.semantics { contentDescription = label }) {
        listOf(Locale.EN to "EN", Locale.ES to "ES").forEachIndexed { i, (l, text) ->
            SegmentedButton(
                selected = locale == l,
                onClick = { if (locale != l) setAppLocale(l) },
                shape = SegmentedButtonDefaults.itemShape(i, 2),
                icon = {},
            ) { Text(text) }
        }
    }
}
