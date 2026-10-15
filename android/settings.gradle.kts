pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "Bassically"

// Same layering as the web app: core = src/theory, rhythm, ear, pitch; audio = src/audio; app = the UI.
include(":core", ":audio", ":app")
