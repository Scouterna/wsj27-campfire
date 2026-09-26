pluginManagement {
  repositories {
    google()
    mavenCentral()
    gradlePluginPortal()
  }
}

dependencyResolutionManagement {
  repositoriesMode.set(RepositoriesMode.PREFER_SETTINGS)
  repositories {
    google()
    mavenCentral()
  }
}

rootProject.name = "Campfire"

// The module's directory is config/app rather than src/app, because a Gradle project
// directory is where its build file lives, and a build file inside src/ lands in the
// Kotlin source set and fails to compile. A module's build file is configuration, which
// config/ holds in every app.
include(":app")
project(":app").projectDir = file("config/app")
