package com.perceptronics.musicteacher.features.ear

import android.content.Context
import androidx.core.content.edit
import com.perceptronics.musicteacher.core.ear.Counts
import com.perceptronics.musicteacher.core.ear.ItemStats
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/**
 * Right/wrong counts per item, remembered on this device so practice picks up where you left
 * off (port of src/features/ear/useItemStats.ts). Stored as the web's JSON,
 * {"C#":{"right":3,"wrong":1}}, under one key per exercise ("ear.findNote", "ear.intervals").
 */
class ItemStatsStore(context: Context) {
    private val prefs = context.getSharedPreferences("ear", Context.MODE_PRIVATE)

    fun load(key: String): ItemStats = prefs.getString(key, null)?.let(::decode) ?: emptyMap()

    fun save(key: String, stats: ItemStats) {
        prefs.edit { putString(key, encode(stats)) }
    }

    companion object {
        fun encode(stats: ItemStats): String = JsonObject(
            stats.mapValues { (_, c) ->
                JsonObject(
                    mapOf(
                        "right" to JsonPrimitive(c.right),
                        "wrong" to JsonPrimitive(c.wrong),
                    ),
                )
            },
        ).toString()

        /** Anything unreadable counts as no stats, rather than crashing the exercise. */
        fun decode(json: String): ItemStats? = runCatching {
            Json.parseToJsonElement(json).jsonObject.mapValues { (_, v) ->
                val o = v.jsonObject
                Counts(o.getValue("right").jsonPrimitive.int, o.getValue("wrong").jsonPrimitive.int)
            }
        }.getOrNull()
    }
}
