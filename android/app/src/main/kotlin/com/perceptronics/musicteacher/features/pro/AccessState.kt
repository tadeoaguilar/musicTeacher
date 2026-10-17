package com.perceptronics.musicteacher.features.pro

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.core.content.edit
import androidx.core.content.pm.PackageInfoCompat
import com.perceptronics.musicteacher.core.access.Access
import com.perceptronics.musicteacher.core.access.AccessContext
import com.perceptronics.musicteacher.core.access.Entitlement
import com.perceptronics.musicteacher.core.access.Flags
import com.perceptronics.musicteacher.core.access.NO_ENTITLEMENT
import com.perceptronics.musicteacher.core.access.PRO_FEATURE_IDS
import com.perceptronics.musicteacher.core.access.accessTo
import com.perceptronics.musicteacher.core.access.parseFlags
import com.perceptronics.musicteacher.core.access.rolloutBucket
import java.util.UUID
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.doubleOrNull

/**
 * Who can use what on this device (port of src/features/pro/accessStore.ts). Until billing and
 * remote flags exist (docs/MONETIZATION.md), everyone is free and the flags come from a local
 * override only, set in debug builds with
 * `adb shell am start -S -n com.perceptronics.musicteacher/.MainActivity --es access.flags '{"scales.more":{"enabled":true}}'`.
 */
class AccessState(context: Context) {
    private val prefs = context.getSharedPreferences("access", Context.MODE_PRIVATE)
    private val version = PackageInfoCompat.getLongVersionCode(
        context.packageManager.getPackageInfo(context.packageName, 0),
    ).toInt()
    private val bucket = rolloutBucket(installId())

    var entitlement by mutableStateOf(NO_ENTITLEMENT)
        private set
    var flags by mutableStateOf(decodeFlags(prefs.getString(FLAGS_KEY, null)))
        private set
    var paywallOpen by mutableStateOf(false)

    fun accessTo(id: String): Access =
        accessTo(id, AccessContext(entitlement, flags, bucket, System.currentTimeMillis(), version))

    /** The Pro features that aren't hidden: what the paywall lists. */
    fun visibleProFeatures(): List<String> = PRO_FEATURE_IDS.filter { accessTo(it) != Access.HIDDEN }

    /** Replaces the local flag override; null or empty clears it. */
    fun overrideFlags(json: String?) {
        prefs.edit { if (json.isNullOrEmpty()) remove(FLAGS_KEY) else putString(FLAGS_KEY, json) }
        flags = decodeFlags(json)
    }

    /** A random id for this install, only used to pick a rollout bucket; it never leaves the device. */
    private fun installId(): String = prefs.getString(INSTALL_KEY, null)
        ?: UUID.randomUUID().toString().also { id -> prefs.edit { putString(INSTALL_KEY, id) } }

    companion object {
        const val FLAGS_KEY = "access.flags"
        private const val INSTALL_KEY = "access.install"

        /** Anything unreadable counts as no flags. */
        fun decodeFlags(json: String?): Flags =
            json?.let { runCatching { parseFlags(plain(Json.parseToJsonElement(it))) }.getOrNull() } ?: emptyMap()

        private fun plain(e: JsonElement): Any? = when (e) {
            JsonNull -> null
            is JsonObject -> e.mapValues { plain(it.value) }
            is JsonArray -> e.map(::plain)
            is JsonPrimitive -> if (e.isString) e.content else e.booleanOrNull ?: e.doubleOrNull
        }
    }
}

val LocalAccess = staticCompositionLocalOf<AccessState> { error("AccessState not provided") }
