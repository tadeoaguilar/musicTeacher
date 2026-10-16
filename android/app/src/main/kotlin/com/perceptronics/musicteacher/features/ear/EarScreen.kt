package com.perceptronics.musicteacher.features.ear

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.PrimaryTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.perceptronics.musicteacher.R
import com.perceptronics.musicteacher.audio.BassEngine
import com.perceptronics.musicteacher.audio.NoteOptions
import com.perceptronics.musicteacher.core.ear.DEGREE_LABELS
import com.perceptronics.musicteacher.core.ear.INTERVAL_MAX_FRET
import com.perceptronics.musicteacher.core.ear.LEVELS
import com.perceptronics.musicteacher.core.ear.PlayMode
import com.perceptronics.musicteacher.core.ear.Score
import com.perceptronics.musicteacher.core.ear.Verdict
import com.perceptronics.musicteacher.core.ear.firstOf
import com.perceptronics.musicteacher.core.ear.highOf
import com.perceptronics.musicteacher.core.ear.intervalsFor
import com.perceptronics.musicteacher.core.ear.maxFretFor
import com.perceptronics.musicteacher.core.ear.otherOctaves
import com.perceptronics.musicteacher.core.ear.pitchClassOf
import com.perceptronics.musicteacher.core.ear.positionNear
import com.perceptronics.musicteacher.core.ear.positionsOf
import com.perceptronics.musicteacher.core.ear.semitonesOf
import com.perceptronics.musicteacher.core.ear.shapeOf
import com.perceptronics.musicteacher.core.ear.weakest
import com.perceptronics.musicteacher.core.theory.FRET_COUNTS
import com.perceptronics.musicteacher.core.theory.formatInterval
import com.perceptronics.musicteacher.core.theory.formatNote
import com.perceptronics.musicteacher.core.theory.getTuning
import com.perceptronics.musicteacher.core.theory.keySpellings
import com.perceptronics.musicteacher.features.neck.LabelMode
import com.perceptronics.musicteacher.i18n.LocalLocale
import com.perceptronics.musicteacher.i18n.t
import com.perceptronics.musicteacher.ui.controls.Chips
import com.perceptronics.musicteacher.ui.controls.Option
import com.perceptronics.musicteacher.ui.controls.Panel
import com.perceptronics.musicteacher.ui.controls.Segmented
import com.perceptronics.musicteacher.ui.controls.Toggle
import com.perceptronics.musicteacher.ui.controls.TuningFields
import com.perceptronics.musicteacher.ui.fretboard.FretMark
import com.perceptronics.musicteacher.ui.fretboard.Fretboard
import com.perceptronics.musicteacher.ui.fretboard.MarkKind
import com.perceptronics.musicteacher.ui.theme.LocalNeckColors

// Port of src/features/ear/EarPage.tsx, FindNote.tsx, Intervals.tsx and ScorePanel.tsx.

private val TAB_LABELS = mapOf(Exercise.NOTE to "ear.findNote", Exercise.INTERVAL to "ear.intervals.title")

@Composable
fun EarScreen() {
    val context = LocalContext.current
    val vm = viewModel { EarViewModel.create(context) }
    val s = vm.settings
    DisposableEffect(Unit) { onDispose { BassEngine.stop() } }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(
            t("ear.title"),
            style = MaterialTheme.typography.headlineMedium,
            modifier = Modifier.semantics {
                heading()
            },
        )
        Text(
            t("ear.description"),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        val tabsLabel = t("ear.exercises")
        PrimaryTabRow(
            selectedTabIndex = s.exercise.ordinal,
            modifier = Modifier.semantics {
                contentDescription =
                    tabsLabel
            },
        ) {
            Exercise.entries.forEach { exercise ->
                Tab(
                    selected = s.exercise == exercise,
                    onClick = { vm.change(s.copy(exercise = exercise)) },
                    unselectedContentColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    text = { Text(t(TAB_LABELS.getValue(exercise)), fontWeight = FontWeight.Bold) },
                )
            }
        }

        when (s.exercise) {
            Exercise.NOTE -> FindNote(vm)
            Exercise.INTERVAL -> Intervals(vm)
        }

        Panel {
            Chips(
                t("ear.level"),
                s.level,
                LEVELS.map {
                    Option(
                        it,
                        t(
                            if (s.exercise ==
                                Exercise.NOTE
                            ) {
                                "ear.levels.$it"
                            } else {
                                "ear.intervals.levels.$it"
                            },
                        ),
                    )
                },
            ) { vm.change(s.copy(level = it)) }
            if (s.exercise == Exercise.INTERVAL) {
                Chips(
                    t("ear.intervals.play"),
                    s.play,
                    PlayMode.entries.map {
                        Option(it, t("ear.intervals.playModes.${it.id}"))
                    },
                ) {
                    vm.change(s.copy(play = it))
                }
            }
            TuningFields(s.tuning) { vm.change(s.copy(tuning = it)) }
            Segmented(
                t("controls.frets"),
                s.frets,
                FRET_COUNTS.map {
                    Option(it, it.toString())
                },
            ) { vm.change(s.copy(frets = it)) }
            if (s.exercise == Exercise.NOTE) {
                Toggle(t("ear.showName"), s.showName) { vm.change(s.copy(showName = it)) }
            }
            Toggle(t("controls.leftHanded"), s.leftHanded) { vm.change(s.copy(leftHanded = it)) }
        }
    }
}

/** "C♯/D♭" for a pitch class, in the app's language. */
@Composable
private fun nameOfPitchClass(pc: String): String {
    val locale = LocalLocale.current
    return keySpellings(pc).joinToString("/") { formatNote(it, locale) }
}

/** Exercise 1: the app names and plays a note; tap where it is on the neck. */
@Composable
private fun FindNote(vm: EarViewModel) {
    val locale = LocalLocale.current
    val s = vm.settings
    val tuning = getTuning(s.tuning)!!
    val q = vm.noteQuestion
    val answer = vm.noteAnswer
    val noteName = nameOfPitchClass(q.pitchClass)
    val shortName = formatNote(keySpellings(q.pitchClass)[0], locale)
    val tappedName = answer?.let { nameOfPitchClass(pitchClassOf(it.midi)) }

    val marks = if (answer == null) {
        emptyList()
    } else {
        positionsOf(q.midi, tuning, s.frets).map {
            FretMark(
                it.string,
                it.fret,
                MarkKind.TARGET,
                shortName,
                t(
                    "ear.marks.target",
                    "note" to noteName,
                    "fret" to it.fret,
                ),
            )
        } + otherOctaves(q.midi, tuning, s.frets).map {
            FretMark(
                it.string,
                it.fret,
                MarkKind.OCTAVE,
                shortName,
                t(
                    "ear.marks.octave",
                    "note" to noteName,
                    "fret" to it.fret,
                ),
            )
        } + if (answer.verdict == Verdict.WRONG) {
            listOf(
                FretMark(
                    answer.position.string,
                    answer.position.fret,
                    MarkKind.WRONG,
                    formatNote(keySpellings(pitchClassOf(answer.midi))[0], locale),
                    t("ear.marks.wrong", "note" to tappedName!!),
                ),
            )
        } else {
            emptyList()
        }
    }
    val feedback = answer?.let {
        when (it.verdict) {
            Verdict.EXACT -> t("ear.exact")
            Verdict.HIGHER -> t("ear.tappedHigher")
            Verdict.LOWER -> t("ear.tappedLower")
            Verdict.WRONG -> t("ear.wrong", "tapped" to tappedName!!, "note" to noteName)
        }
    }

    Panel {
        Prompt(
            exercise = t("ear.findNote"),
            big = if (s.showName) noteName else "?",
            bigDescription = if (s.showName) noteName else t("ear.hiddenName"),
            instruction = t(
                if (s.showName) "ear.prompt" else "ear.promptHidden",
                "max" to maxFretFor(s.level, s.frets),
            ),
        )
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            HearButton(t("ear.hear"), vm::hearNote)
            if (answer != null) Button(onClick = { vm.askNote(play = true) }) { Text(t("ear.next")) }
        }
        Feedback(feedback, correct = answer?.verdict != Verdict.WRONG)
    }

    Fretboard(
        tuning = tuning,
        fretCount = s.frets,
        notes = emptyList(),
        labels = LabelMode.NOTE,
        leftHanded = s.leftHanded,
        path = emptySet(),
        active = null,
        title = t("ear.fretboard"),
        onPlay = {},
        onFretTap = vm::tapNote,
        marks = marks,
    )

    if (answer != null) {
        val neck = LocalNeckColors.current
        Legend(
            listOfNotNull(
                Swatch(neck.inTune, null) to t("ear.legend.target"),
                Swatch(null, neck.inTune) to t("ear.legend.octave"),
                (Swatch(neck.wrong, null) to t("ear.legend.wrong")).takeIf { answer.verdict == Verdict.WRONG },
            ),
        )
    }

    ScorePanel(vm.noteScore, weakest(vm.noteStats).map { nameOfPitchClass(it) })
}

/** Exercise 2: the app plays two notes; name the interval, then see its shape on the neck. */
@Composable
private fun Intervals(vm: EarViewModel) {
    val locale = LocalLocale.current
    val s = vm.settings
    val tuning = getTuning(s.tuning)!!
    val q = vm.intervalQuestion
    val answer = vm.intervalAnswer
    val maxFret = minOf(s.frets, INTERVAL_MAX_FRET)
    val correct = answer == q.interval
    val nameOf = @Composable { id: String -> t("ear.intervals.names.$id") }
    val noteOf = { midi: Int -> formatNote(keySpellings(pitchClassOf(midi))[0], locale) }

    val shape = shapeOf(q.low, highOf(q), tuning, maxFret)
    val wrongAt = if (answer != null && !correct && shape != null) {
        positionNear(q.low + semitonesOf(answer), shape.low, tuning, maxFret)
    } else {
        null
    }
    val marks = if (answer != null && shape != null) {
        listOfNotNull(
            FretMark(
                shape.low.string,
                shape.low.fret,
                MarkKind.ROOT,
                noteOf(q.low),
                t("ear.intervals.marks.low", "note" to noteOf(q.low), "fret" to shape.low.fret),
            ),
            FretMark(
                shape.high.string,
                shape.high.fret,
                MarkKind.TARGET,
                formatInterval(DEGREE_LABELS.getValue(q.interval)),
                t(
                    "ear.intervals.marks.high",
                    "interval" to nameOf(q.interval),
                    "note" to noteOf(highOf(q)),
                    "fret" to shape.high.fret,
                ),
            ),
            wrongAt?.let {
                FretMark(
                    it.string,
                    it.fret,
                    MarkKind.WRONG,
                    formatInterval(DEGREE_LABELS.getValue(answer)),
                    t("ear.intervals.marks.wrong", "interval" to nameOf(answer), "fret" to it.fret),
                )
            },
        )
    } else {
        emptyList()
    }

    Panel {
        Prompt(
            exercise = t("ear.intervals.title"),
            big = if (answer != null) nameOf(q.interval) else "?",
            bigDescription = null,
            instruction = t("ear.intervals.prompt", "direction" to t("ear.intervals.direction.${q.direction.id}")),
        )
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            HearButton(t("ear.hear"), vm::playInterval)
            FilledTonalButton(onClick = { BassEngine.playNote(firstOf(q), NoteOptions(duration = 1.0)) }) {
                Text(t("ear.intervals.hearFirst"))
            }
            if (answer != null) Button(onClick = { vm.askInterval(play = true) }) { Text(t("ear.intervals.next")) }
        }
        val neck = LocalNeckColors.current
        val answersLabel = t("ear.intervals.answers")
        FlowRow(
            Modifier.semantics { contentDescription = answersLabel },
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            intervalsFor(s.level).forEach { id ->
                val state = when {
                    answer == null -> null
                    id == q.interval -> neck.inTune
                    id == answer -> neck.wrong
                    else -> null
                }
                OutlinedButton(
                    onClick = { vm.chooseInterval(id) },
                    enabled = answer == null || state != null,
                    border = BorderStroke(2.dp, state ?: MaterialTheme.colorScheme.outline),
                ) {
                    Text(nameOf(id), color = state ?: MaterialTheme.colorScheme.onSurface)
                }
            }
        }
        val feedback = answer?.let {
            if (correct) {
                t("ear.intervals.correct", "interval" to nameOf(q.interval))
            } else {
                t("ear.intervals.wrong", "answer" to nameOf(it), "interval" to nameOf(q.interval))
            }
        }
        Feedback(feedback, correct)
    }

    Fretboard(
        tuning = tuning,
        fretCount = s.frets,
        notes = emptyList(),
        labels = LabelMode.NOTE,
        leftHanded = s.leftHanded,
        path = emptySet(),
        active = null,
        title = t("ear.intervals.fretboard"),
        onPlay = { BassEngine.playNote(it) },
        marks = marks,
    )

    if (answer != null) {
        val neck = LocalNeckColors.current
        Legend(
            listOfNotNull(
                Swatch(neck.root, null) to t("ear.intervals.legend.low"),
                Swatch(neck.inTune, null) to t("ear.intervals.legend.high"),
                (Swatch(neck.wrong, null) to t("ear.legend.wrong")).takeIf { wrongAt != null },
            ),
        )
    }

    ScorePanel(vm.intervalScore, weakest(vm.intervalStats).map { nameOf(it) })
}

@Composable
private fun Prompt(exercise: String, big: String, bigDescription: String?, instruction: String) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(
            exercise.uppercase(),
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.semantics { heading() },
        )
        Text(
            big,
            fontSize = 52.sp,
            lineHeight = 56.sp,
            fontWeight = FontWeight.ExtraBold,
            color = MaterialTheme.colorScheme.primary,
            modifier = if (bigDescription !=
                null
            ) {
                Modifier.semantics { contentDescription = bigDescription }
            } else {
                Modifier
            },
        )
        Text(
            instruction,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun HearButton(label: String, onClick: () -> Unit) {
    FilledTonalButton(onClick = onClick) {
        Icon(painterResource(R.drawable.ic_play), contentDescription = null)
        Text(label, Modifier.padding(start = 6.dp))
    }
}

@Composable
private fun Feedback(text: String?, correct: Boolean) {
    val neck = LocalNeckColors.current
    Text(
        text ?: "",
        style = MaterialTheme.typography.bodyLarge,
        fontWeight = FontWeight.Bold,
        color = if (correct) neck.inTune else neck.wrong,
        modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
    )
}

/** A legend dot: filled, or a dashed-style ring when only `ring` is given. */
private data class Swatch(val fill: Color?, val ring: Color?)

@Composable
private fun Legend(items: List<Pair<Swatch, String>>) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        items.forEach { (swatch, label) ->
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Box(
                    Modifier
                        .size(14.dp)
                        .then(swatch.fill?.let { Modifier.background(it, CircleShape) } ?: Modifier)
                        .then(swatch.ring?.let { Modifier.border(2.5.dp, it, CircleShape) } ?: Modifier),
                )
                Text(label, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

/** Score and streaks for this session, and the items missed most (already named). */
@Composable
private fun ScorePanel(score: Score, toPractice: List<String>) {
    Panel {
        Text(
            t("ear.progress"),
            style = MaterialTheme.typography.titleSmall,
            modifier = Modifier.semantics {
                heading()
            },
        )
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceAround) {
            listOf(
                t("ear.score") to "${score.right}/${score.total}",
                t("ear.streak") to score.streak.toString(),
                t("ear.best") to score.best.toString(),
            ).forEach { (label, value) ->
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        label,
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(value, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                }
            }
        }
        if (toPractice.isNotEmpty()) {
            Text(
                "${t("ear.practiceMore")}: ${toPractice.joinToString(", ")}",
                style = MaterialTheme.typography.bodyMedium,
            )
        }
    }
}
