package com.perceptronics.musicteacher.core.access

import kotlin.math.floor

// Port of src/access/access.ts: what's free, what's Pro, and whether a feature is open,
// locked or hidden for someone.

enum class Tier { FREE, PRO }

private class FeatureDef(val tier: Tier, val hidden: Boolean = false)

/** Every feature that can be gated. What exists today is free; the Pro entries stay hidden until flagged on. */
private val FEATURES = linkedMapOf(
    "scales" to FeatureDef(Tier.FREE),
    "arpeggios" to FeatureDef(Tier.FREE),
    "metronome" to FeatureDef(Tier.FREE),
    "tuner" to FeatureDef(Tier.FREE),
    "ear.findNote" to FeatureDef(Tier.FREE),
    "ear.intervals" to FeatureDef(Tier.FREE),
    "scales.more" to FeatureDef(Tier.PRO, hidden = true),
    "rhythm.programs" to FeatureDef(Tier.PRO, hidden = true),
)

val FEATURE_IDS: List<String> = FEATURES.keys.toList()

fun isFeatureId(value: String) = value in FEATURES

fun tierOf(id: String): Tier = FEATURES.getValue(id).tier

/** Pro features, in catalog order: what the paywall lists. */
val PRO_FEATURE_IDS: List<String> = FEATURE_IDS.filter { tierOf(it) == Tier.PRO }

/** What billing says about a user. [expiresAt] in ms since the epoch; null never expires. */
data class Entitlement(val pro: Boolean, val expiresAt: Long? = null)

val NO_ENTITLEMENT = Entitlement(pro = false)

fun isPro(entitlement: Entitlement, now: Long): Boolean =
    entitlement.pro && (entitlement.expiresAt == null || now < entitlement.expiresAt)

/** A remote switch for one feature. Null fields keep the catalog's behavior. */
data class FeatureFlag(
    val enabled: Boolean? = null,
    val free: Boolean? = null,
    val rollout: Int? = null,
    val minVersion: Int? = null,
)

typealias Flags = Map<String, FeatureFlag>

/**
 * Keeps the valid flags from untrusted JSON, given as plain values (maps, lists, numbers,
 * strings, booleans, null); drops the rest.
 */
fun parseFlags(value: Any?): Flags {
    if (value !is Map<*, *>) return emptyMap()
    val flags = LinkedHashMap<String, FeatureFlag>()
    for ((id, raw) in value) {
        if (id !is String || !isFeatureId(id) || raw !is Map<*, *>) continue
        val rollout = (raw["rollout"] as? Number)?.toDouble()?.takeIf { it.isFinite() }
        val minVersion = (raw["minVersion"] as? Number)?.toDouble()?.takeIf { it.isFinite() && it % 1.0 == 0.0 }
        flags[id] = FeatureFlag(
            enabled = raw["enabled"] as? Boolean,
            free = raw["free"] as? Boolean,
            // Math.round in JS rounds halves up, like floor(x + 0.5).
            rollout = rollout?.let { floor(it + 0.5).toInt().coerceIn(0, 100) },
            minVersion = minVersion?.toInt(),
        )
    }
    return flags
}

/** A stable 0–99 bucket for gradual rollouts (FNV-1a over UTF-16 code units). */
fun rolloutBucket(key: String): Int {
    var hash = 0x811c9dc5.toInt()
    for (c in key) {
        hash = hash xor c.code
        hash *= 0x01000193
    }
    return (hash.toUInt() % 100u).toInt()
}

enum class Access { OPEN, LOCKED, HIDDEN }

data class AccessContext(
    val entitlement: Entitlement,
    val flags: Flags,
    val bucket: Int,
    val now: Long,
    /** The app's versionCode; null skips the minimum-version check, as on the web. */
    val version: Int? = null,
)

/** Open (usable), locked (Pro badge, opens the paywall) or hidden. Flags decide visibility first. */
fun accessTo(id: String, ctx: AccessContext): Access {
    val def = FEATURES.getValue(id)
    val flag = ctx.flags[id] ?: FeatureFlag()
    val enabled = flag.enabled ?: !def.hidden
    if (!enabled) return Access.HIDDEN
    if (flag.rollout != null && ctx.bucket >= flag.rollout) return Access.HIDDEN
    if (flag.minVersion != null && ctx.version != null && ctx.version < flag.minVersion) return Access.HIDDEN
    if (def.tier == Tier.FREE || flag.free == true) return Access.OPEN
    return if (isPro(ctx.entitlement, ctx.now)) Access.OPEN else Access.LOCKED
}
