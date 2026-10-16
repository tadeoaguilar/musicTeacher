package com.perceptronics.musicteacher

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.perceptronics.musicteacher.core.theory.Locale
import com.perceptronics.musicteacher.features.PlaceholderScreen
import com.perceptronics.musicteacher.features.Section
import com.perceptronics.musicteacher.features.arpeggios.ArpeggiosScreen
import com.perceptronics.musicteacher.features.scales.ScalesScreen
import com.perceptronics.musicteacher.i18n.LocalLocale
import com.perceptronics.musicteacher.i18n.setAppLocale
import com.perceptronics.musicteacher.i18n.t

/** The app frame: title and language switch on top, the five sections in a bottom bar. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppShell() {
    val nav = rememberNavController()
    val current by nav.currentBackStackEntryAsState()
    val route = current?.destination?.route

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.app_name)) },
                actions = { LanguageSwitch(Modifier.padding(end = 12.dp)) },
            )
        },
        bottomBar = {
            NavigationBar {
                Section.entries.forEach { section ->
                    NavigationBarItem(
                        selected = route == section.id,
                        onClick = {
                            nav.navigate(section.id) {
                                // Standard bottom-bar behavior: one copy of each section, state kept.
                                popUpTo(nav.graph.findStartDestination().id) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = { Icon(painterResource(section.icon), contentDescription = null) },
                        label = { Text(t("app.nav.${section.id}"), maxLines = 1) },
                    )
                }
            }
        },
    ) { padding ->
        NavHost(nav, startDestination = Section.SCALES.id, modifier = Modifier.padding(padding)) {
            Section.entries.forEach { section ->
                composable(section.id) {
                    when (section) {
                        Section.SCALES -> ScalesScreen()
                        Section.ARPEGGIOS -> ArpeggiosScreen()
                        else -> PlaceholderScreen(section)
                    }
                }
            }
        }
    }
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
