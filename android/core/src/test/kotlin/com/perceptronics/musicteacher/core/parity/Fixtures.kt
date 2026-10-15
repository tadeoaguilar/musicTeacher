package com.perceptronics.musicteacher.core.parity

import kotlin.test.assertEquals
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.double
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long

/**
 * The web app's results for the same inputs, written by `npm run android:fixtures`
 * (scripts/android-fixtures.ts). The Kotlin port must reproduce them exactly.
 */
object Fixtures {
    private val cache = mutableMapOf<String, JsonElement>()

    fun load(name: String): JsonElement = cache.getOrPut(name) {
        val text = javaClass.getResource("/fixtures/$name.json")?.readText()
            ?: error("Missing fixtures/$name.json: run `npm run android:fixtures` in the repo root")
        Json.parseToJsonElement(text).jsonObject
    }
}

operator fun JsonElement.get(key: String): JsonElement = jsonObject.getValue(key)

operator fun JsonElement.get(index: Int): JsonElement = jsonArray[index]

val JsonElement.array: JsonArray get() = jsonArray
val JsonElement.str: String get() = jsonPrimitive.content
val JsonElement.int: Int get() = jsonPrimitive.int
val JsonElement.long: Long get() = jsonPrimitive.long
val JsonElement.double: Double get() = jsonPrimitive.double
val JsonElement.bool: Boolean get() = jsonPrimitive.boolean
val JsonElement.isNull: Boolean get() = this is JsonNull

fun JsonElement.strings(): List<String> = jsonArray.map { it.str }

fun JsonElement.ints(): List<Int> = jsonArray.map { it.int }

fun JsonElement.intOrNull(): Int? = if (isNull) null else int

fun JsonElement.doubleOrNull(): Double? = if (isNull) null else double

/** Doubles from the same IEEE arithmetic should match exactly; allow for the last bit anyway. */
fun assertClose(expected: Double, actual: Double, message: String? = null) =
    assertEquals(expected, actual, 1e-12 * maxOf(1.0, kotlin.math.abs(expected)), message)

/** For maps of optional fields: a JSON key that's absent means null. */
fun JsonElement.opt(key: String): JsonElement = (this as JsonObject)[key] ?: JsonNull
