plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.perceptronics.musicteacher"
    compileSdk = 37
    // The same NDK as :audio, so release builds can strip the native libraries' debug symbols.
    ndkVersion = "30.0.16248370"

    defaultConfig {
        applicationId = "com.perceptronics.musicteacher"
        minSdk = 26
        targetSdk = 37
        versionCode = 1
        versionName = "0.1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            // Symbol tables go into the App Bundle, so Play can show native crash stack traces.
            ndk { debugSymbolLevel = "SYMBOL_TABLE" }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
    }

    androidResources {
        // English and Spanish only, like the web app (drops other locales from libraries).
        localeFilters += listOf("en", "es")
    }

    lint {
        abortOnError = true
        warningsAsErrors = false
    }
}

dependencies {
    implementation(project(":core"))
    implementation(project(":audio"))

    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.navigation.compose)
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.material3)
    implementation(libs.compose.ui.tooling.preview)
    debugImplementation(libs.compose.ui.tooling)
    implementation(libs.kotlinx.serialization.json)

    testImplementation(libs.kotlin.test)
}

// The web app's strings (src/i18n/en.json and es.json) are the single source for both apps.
val copyWebStrings = tasks.register<CopyWebStrings>("copyWebStrings") {
    source.from(rootProject.file("../src/i18n/en.json"), rootProject.file("../src/i18n/es.json"))
}

androidComponents {
    onVariants { variant ->
        variant.sources.assets?.addGeneratedSourceDirectory(copyWebStrings, CopyWebStrings::outputDir)
    }
}
