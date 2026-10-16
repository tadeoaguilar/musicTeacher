package com.perceptronics.musicteacher.features.neck

import java.net.URLDecoder
import java.net.URLEncoder

/**
 * A web query string ("key=C&scale=major"), like `URLSearchParams`. Each section saves its
 * settings in one with the web's param names, so a shared web link can open the same view.
 */
class Params private constructor(private val values: LinkedHashMap<String, String>) {
    constructor() : this(LinkedHashMap())

    operator fun get(name: String): String? = values[name]

    operator fun set(name: String, value: String) {
        values[name] = value
    }

    override fun toString() = values.entries.joinToString("&") { (k, v) -> "${encode(k)}=${encode(v)}" }

    companion object {
        fun parse(query: String): Params {
            val values = LinkedHashMap<String, String>()
            for (pair in query.removePrefix("?").split('&')) {
                if (pair.isEmpty()) continue
                val i = pair.indexOf('=')
                val name = decode(if (i < 0) pair else pair.substring(0, i))
                // The first value wins, like URLSearchParams.get.
                values.putIfAbsent(name, if (i < 0) "" else decode(pair.substring(i + 1)))
            }
            return Params(values)
        }

        private fun encode(s: String) = URLEncoder.encode(s, "UTF-8")

        private fun decode(s: String) = URLDecoder.decode(s, "UTF-8")
    }
}
