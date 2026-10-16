package com.perceptronics.musicteacher.features.tuner

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.Settings
import androidx.activity.compose.LocalActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.viewmodel.compose.viewModel
import com.perceptronics.musicteacher.R
import com.perceptronics.musicteacher.audio.BassEngine
import com.perceptronics.musicteacher.audio.MicInput
import com.perceptronics.musicteacher.audio.NoteOptions
import com.perceptronics.musicteacher.core.pitch.Smoother
import com.perceptronics.musicteacher.core.pitch.matchString
import com.perceptronics.musicteacher.core.pitch.readNote
import com.perceptronics.musicteacher.core.theory.getTuning
import com.perceptronics.musicteacher.core.theory.noteMidi
import com.perceptronics.musicteacher.features.neck.SavedSettings
import com.perceptronics.musicteacher.i18n.t
import com.perceptronics.musicteacher.ui.controls.LabeledSlider
import com.perceptronics.musicteacher.ui.controls.Panel
import com.perceptronics.musicteacher.ui.controls.TuningFields
import com.perceptronics.musicteacher.ui.tuner.HeardNote
import com.perceptronics.musicteacher.ui.tuner.InputLevel
import com.perceptronics.musicteacher.ui.tuner.StringButtons
import com.perceptronics.musicteacher.ui.tuner.TunerMeter

// Port of src/features/tuner/TunerPage.tsx.

/** How long a reference tone rings, in seconds. */
private const val REFERENCE_SECONDS = 2.0

/** Why the microphone isn't listening; keys under `android.tuner.errors`. */
enum class MicError(val key: String) {
    /** Refused this time; asking again is allowed. */
    DENIED("denied"),

    /** Refused for good ("don't ask again"): only the app's settings can change it. */
    SETTINGS("settings"),
    NO_DEVICE("no-device"),
}

class TunerViewModel(private val saved: SavedSettings) : ViewModel() {
    var settings by mutableStateOf(TunerSettings.fromParams(saved.load("tuner")))
        private set
    var listening by mutableStateOf(false)
        private set

    /** Smoothed detected pitch in Hz, or null when no note is ringing. */
    var hz by mutableStateOf<Double?>(null)
        private set

    /** Microphone RMS level, 0–1. */
    var level by mutableDoubleStateOf(0.0)
        private set
    var error by mutableStateOf<MicError?>(null)
    private val smoother = Smoother()

    fun change(new: TunerSettings) {
        settings = new
        saved.save("tuner", new.toParams())
    }

    fun start(context: Context) {
        error = null
        smoother.reset()
        listening = MicInput.start(context) { frame ->
            hz = smoother.push(frame.hz)
            level = frame.level
        }
        if (!listening) error = MicError.NO_DEVICE
    }

    fun stop() {
        MicInput.stop()
        smoother.reset()
        listening = false
        hz = null
        level = 0.0
    }

    override fun onCleared() = stop()

    companion object {
        fun create(context: Context) = TunerViewModel(SavedSettings(context.applicationContext))
    }
}

@Composable
fun TunerScreen() {
    val context = LocalContext.current
    val activity = LocalActivity.current
    val vm = viewModel { TunerViewModel.create(context) }
    val s = vm.settings
    val tuning = getTuning(s.tuning)!!

    val askForMic = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        when {
            granted -> vm.start(context)

            // No rationale after a refusal means "don't ask again": only Settings can undo it.
            activity?.shouldShowRequestPermissionRationale(Manifest.permission.RECORD_AUDIO) == false ->
                vm.error =
                    MicError.SETTINGS

            else -> vm.error = MicError.DENIED
        }
    }
    val start = {
        if (context.checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            vm.start(context)
        } else {
            askForMic.launch(Manifest.permission.RECORD_AUDIO)
        }
    }

    // Release the microphone when leaving the section or the app.
    DisposableEffect(Unit) { onDispose { vm.stop() } }
    LifecycleEventEffect(Lifecycle.Event.ON_STOP) { vm.stop() }

    val reading = vm.hz?.let { readNote(it, s.a4.toDouble()) }
    val stringIndex = reading?.let { matchString(it.midi, tuning) }
    // A matching string keeps the tuning's own spelling (Eb1 on a half-step-down bass, not D#1).
    val note = reading?.let { HeardNote(stringIndex?.let(tuning.strings::get) ?: it.name, it.cents, vm.hz!!) }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(
            t("tuner.title"),
            style = MaterialTheme.typography.headlineMedium,
            modifier = Modifier.semantics {
                heading()
            },
        )
        Text(
            t("tuner.description"),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        Panel {
            TunerMeter(note, vm.listening)
            StringButtons(tuning, stringIndex) { i ->
                BassEngine.playNote(
                    noteMidi(tuning.strings[i]),
                    NoteOptions(a4 = s.a4.toDouble(), duration = REFERENCE_SECONDS),
                )
            }
            Column(
                Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Button(
                    onClick = if (vm.listening) vm::stop else start,
                    modifier = Modifier.fillMaxWidth(),
                    colors = if (vm.listening) {
                        ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary)
                    } else {
                        ButtonDefaults.buttonColors()
                    },
                ) {
                    Icon(
                        painterResource(if (vm.listening) R.drawable.ic_stop else R.drawable.ic_mic),
                        contentDescription = null,
                    )
                    Text(if (vm.listening) t("tuner.stop") else t("tuner.start"), Modifier.padding(start = 8.dp))
                }
                if (vm.listening) InputLevel(vm.level)
                vm.error?.let { error ->
                    Text(
                        t("android.tuner.errors.${error.key}"),
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.semantics { liveRegion = LiveRegionMode.Assertive },
                    )
                    if (error == MicError.SETTINGS) {
                        OutlinedButton(onClick = {
                            val uri = Uri.fromParts("package", context.packageName, null)
                            context.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, uri))
                        }) { Text(t("android.tuner.errors.openSettings")) }
                    }
                }
                Text(
                    t("tuner.privacy"),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        Panel {
            TuningFields(s.tuning) { vm.change(s.copy(tuning = it)) }
            LabeledSlider(t("tuner.a4"), "${s.a4} Hz", s.a4, A4_MIN..A4_MAX, { vm.change(s.copy(a4 = it)) })
        }
    }
}
