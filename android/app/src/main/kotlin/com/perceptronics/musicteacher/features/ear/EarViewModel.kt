package com.perceptronics.musicteacher.features.ear

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import com.perceptronics.musicteacher.audio.BassEngine
import com.perceptronics.musicteacher.audio.NoteOptions
import com.perceptronics.musicteacher.core.ear.EMPTY_SCORE
import com.perceptronics.musicteacher.core.ear.FindNoteOptions
import com.perceptronics.musicteacher.core.ear.IntervalDirection
import com.perceptronics.musicteacher.core.ear.IntervalOptions
import com.perceptronics.musicteacher.core.ear.IntervalQuestion
import com.perceptronics.musicteacher.core.ear.ItemStats
import com.perceptronics.musicteacher.core.ear.Verdict
import com.perceptronics.musicteacher.core.ear.addToScore
import com.perceptronics.musicteacher.core.ear.createRandom
import com.perceptronics.musicteacher.core.ear.highOf
import com.perceptronics.musicteacher.core.ear.isCorrect
import com.perceptronics.musicteacher.core.ear.judge
import com.perceptronics.musicteacher.core.ear.nextIntervalQuestion
import com.perceptronics.musicteacher.core.ear.nextQuestion
import com.perceptronics.musicteacher.core.ear.recordAnswer
import com.perceptronics.musicteacher.core.theory.FretPosition
import com.perceptronics.musicteacher.core.theory.getTuning
import com.perceptronics.musicteacher.core.theory.openStringMidi
import com.perceptronics.musicteacher.features.neck.SavedSettings

// The state of src/features/ear/FindNote.tsx and Intervals.tsx, kept across tab switches.

/** Seconds between the two notes of a melodic interval. */
private const val GAP = 0.9

/** A Find the note answer: where you tapped, what it was, and how it was judged. */
data class NoteAnswer(val position: FretPosition, val midi: Int, val verdict: Verdict)

class EarViewModel(private val saved: SavedSettings, private val statsStore: ItemStatsStore) : ViewModel() {
    var settings by mutableStateOf(EarSettings.fromParams(saved.load("ear")))
        private set
    private val random = createRandom()

    // Exercise 1: Find the note.
    var noteStats by mutableStateOf(statsStore.load(NOTE_STATS))
        private set
    var noteQuestion by mutableStateOf(nextQuestion(noteOptions(), random, noteStats))
        private set
    var noteAnswer by mutableStateOf<NoteAnswer?>(null)
        private set
    var noteScore by mutableStateOf(EMPTY_SCORE)
        private set

    // Exercise 2: Name the interval.
    var intervalStats by mutableStateOf(statsStore.load(INTERVAL_STATS))
        private set
    var intervalQuestion by mutableStateOf(nextIntervalQuestion(intervalOptions(), random, intervalStats))
        private set
    var intervalAnswer by mutableStateOf<String?>(null)
        private set
    var intervalScore by mutableStateOf(EMPTY_SCORE)
        private set

    private fun noteOptions() = FindNoteOptions(getTuning(settings.tuning)!!, settings.frets, settings.level)

    private fun intervalOptions() =
        IntervalOptions(getTuning(settings.tuning)!!, settings.frets, settings.level, settings.play)

    fun change(new: EarSettings) {
        val old = settings
        settings = new
        saved.save("ear", new.toParams())
        // A different level or neck changes what can be asked: ask again (without playing).
        val neck = old.level != new.level || old.tuning != new.tuning || old.frets != new.frets
        if (neck) askNote(play = false)
        if (neck || old.play != new.play) askInterval(play = false)
    }

    fun askNote(play: Boolean) {
        noteQuestion = nextQuestion(noteOptions(), random, noteStats, noteQuestion)
        noteAnswer = null
        if (play) BassEngine.playNote(noteQuestion.midi)
    }

    fun hearNote() = BassEngine.playNote(noteQuestion.midi)

    fun tapNote(string: Int, fret: Int) {
        val midi = openStringMidi(getTuning(settings.tuning)!!)[string] + fret
        BassEngine.playNote(midi)
        if (noteAnswer != null) return
        val verdict = judge(noteQuestion, midi)
        val correct = isCorrect(verdict)
        noteAnswer = NoteAnswer(FretPosition(string, fret), midi, verdict)
        noteScore = addToScore(noteScore, correct)
        noteStats = record(NOTE_STATS, noteStats, noteQuestion.pitchClass, correct)
    }

    fun askInterval(play: Boolean) {
        intervalQuestion = nextIntervalQuestion(intervalOptions(), random, intervalStats, intervalQuestion)
        intervalAnswer = null
        if (play) playInterval()
    }

    fun playInterval() = play(intervalQuestion)

    fun chooseInterval(id: String) {
        if (intervalAnswer != null) return
        val correct = id == intervalQuestion.interval
        intervalAnswer = id
        intervalScore = addToScore(intervalScore, correct)
        intervalStats = record(INTERVAL_STATS, intervalStats, intervalQuestion.interval, correct)
    }

    private fun record(key: String, stats: ItemStats, item: String, correct: Boolean): ItemStats =
        recordAnswer(stats, item, correct).also { statsStore.save(key, it) }

    override fun onCleared() = BassEngine.stop()

    companion object {
        const val NOTE_STATS = "ear.findNote"
        const val INTERVAL_STATS = "ear.intervals"

        fun create(context: Context) = EarViewModel(
            SavedSettings(context.applicationContext),
            ItemStatsStore(context.applicationContext),
        )

        private fun play(q: IntervalQuestion) {
            val low = q.low
            val high = highOf(q)
            if (q.direction == IntervalDirection.TOGETHER) {
                BassEngine.playNote(low, NoteOptions(duration = 1.6))
                BassEngine.playNote(high, NoteOptions(duration = 1.6))
                return
            }
            val (first, second) = if (q.direction == IntervalDirection.UP) low to high else high to low
            BassEngine.playNote(first, NoteOptions(duration = 1.0))
            BassEngine.playNote(second, NoteOptions(duration = 1.3, delay = GAP))
        }
    }
}
