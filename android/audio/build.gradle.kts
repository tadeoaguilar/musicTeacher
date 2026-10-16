plugins {
    alias(libs.plugins.android.library)
}

android {
    namespace = "com.perceptronics.musicteacher.audio"
    compileSdk = 37

    ndkVersion = "30.0.16248370"

    defaultConfig {
        minSdk = 26
        externalNativeBuild {
            cmake {
                arguments += "-DANDROID_STL=c++_shared"
            }
        }
    }

    externalNativeBuild {
        cmake {
            path = file("src/main/cpp/CMakeLists.txt")
            version = "4.1.2"
        }
    }

    buildFeatures {
        prefab = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation(project(":core"))
    implementation(libs.oboe)

    testImplementation(libs.kotlin.test)
}
