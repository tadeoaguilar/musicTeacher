package com.perceptronics.musicteacher.i18n

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject

/**
 * The web app's strings (src/i18n/<lang>.json), read the way i18next reads them:
 * dotted keys ("app.nav.scales"), {{name}} interpolation, and `_one` / `_other`
 * plurals chosen by a `count` argument. A missing key shows the key itself.
 */
class Strings(private val root: JsonObject) {
    fun t(key: String, vararg args: Pair<String, Any>): String {
        val values = args.toMap()
        val count = values["count"] as? Number
        val text = count?.let { lookup(key + if (it.toDouble() == 1.0) "_one" else "_other") } ?: lookup(key) ?: key
        return PLACEHOLDER.replace(text) { values[it.groupValues[1]]?.toString() ?: it.value }
    }

    private fun lookup(key: String): String? {
        var node: JsonObject = root
        val parts = key.split('.')
        for (part in parts.dropLast(1)) node = node[part] as? JsonObject ?: return null
        return (node[parts.last()] as? JsonPrimitive)?.contentOrNull
    }

    companion object {
        private val PLACEHOLDER = Regex("\\{\\{\\s*(\\w+)\\s*\\}\\}")

        fun parse(json: String) = Strings(Json.parseToJsonElement(json).jsonObject)
    }
}
