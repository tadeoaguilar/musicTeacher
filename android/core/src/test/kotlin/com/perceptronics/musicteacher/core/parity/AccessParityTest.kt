package com.perceptronics.musicteacher.core.parity

import com.perceptronics.musicteacher.core.access.AccessContext
import com.perceptronics.musicteacher.core.access.Entitlement
import com.perceptronics.musicteacher.core.access.FEATURE_IDS
import com.perceptronics.musicteacher.core.access.FeatureFlag
import com.perceptronics.musicteacher.core.access.Flags
import com.perceptronics.musicteacher.core.access.PRO_FEATURE_IDS
import com.perceptronics.musicteacher.core.access.accessTo
import com.perceptronics.musicteacher.core.access.isPro
import com.perceptronics.musicteacher.core.access.parseFlags
import com.perceptronics.musicteacher.core.access.rolloutBucket
import com.perceptronics.musicteacher.core.access.tierOf
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.doubleOrNull

/** src/access against the web app's results (fixtures/access.json). */
class AccessParityTest {
    private val f = Fixtures.load("access")

    @Test
    fun catalog() {
        assertEquals(
            f["catalog"].array.map { it[0].str to it[1].str },
            FEATURE_IDS.map {
                it to
                    tierOf(it).name.lowercase()
            },
        )
        assertEquals(f["pro"].strings(), PRO_FEATURE_IDS)
    }

    @Test
    fun entitlements() {
        for (c in f["isPro"].array) assertEquals(c["pro"].bool, isPro(entitlement(c["entitlement"]), c["now"].long))
    }

    @Test
    fun buckets() {
        for (c in f["buckets"].array) assertEquals(c[1].int, rolloutBucket(c[0].str), c[0].str)
    }

    @Test
    fun parsing() {
        for (c in f["parsed"].array) assertEquals(flags(c["flags"]), parseFlags(plain(c["raw"])), c["raw"].toString())
    }

    @Test
    fun access() {
        for (c in f["access"].array) {
            val ctx = AccessContext(
                entitlement(c["entitlement"]),
                flags(c["flags"]),
                c["bucket"].int,
                c["now"].long,
                c["version"].intOrNull(),
            )
            assertEquals(c["access"].strings(), FEATURE_IDS.map { accessTo(it, ctx).name.lowercase() }, c.toString())
        }
    }

    private fun entitlement(e: JsonElement) =
        Entitlement(e["pro"].bool, if (e["expiresAt"].isNull) null else e["expiresAt"].long)

    private fun flags(e: JsonElement): Flags = (e as JsonObject).mapValues { (_, v) ->
        FeatureFlag(
            enabled = v.opt("enabled").let { if (it.isNull) null else it.bool },
            free = v.opt("free").let { if (it.isNull) null else it.bool },
            rollout = v.opt("rollout").intOrNull(),
            minVersion = v.opt("minVersion").intOrNull(),
        )
    }

    /** JSON as the plain values parseFlags takes. */
    private fun plain(e: JsonElement): Any? = when (e) {
        JsonNull -> null
        is JsonObject -> e.mapValues { plain(it.value) }
        is JsonArray -> e.map(::plain)
        is JsonPrimitive -> if (e.isString) e.content else e.booleanOrNull ?: e.doubleOrNull
    }
}
