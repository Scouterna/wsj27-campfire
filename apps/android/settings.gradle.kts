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

// The one module. Its directory is config/app rather than src/app: a Gradle project
// directory is where its build file lives, and a build file inside src/ lands in the
// Kotlin source set that src/ defines. Kotlin 2.3 noticed it could not read the file as
// a source script and ignored it; 2.4 compiles it and fails. config/, assets/, and src/
// mean the same thing here as they do in every other app, and a module's build file is
// configuration.
include(":app")
project(":app").projectDir = file("config/app")
