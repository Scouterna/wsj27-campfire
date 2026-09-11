plugins {
  id("com.android.application") version "9.4.0" apply false
  id("org.jetbrains.kotlin.plugin.compose") version "2.4.10" apply false

  // Style and code quality, as Gradle plugins rather than as binaries on the
  // developer's machine: the checks then need nothing but a JDK, which is what
  // lets them run on a continuous integration runner.
  //
  // ktlint is applied here as well as in :app, so that `ktlintCheck` covers this file
  // and settings.gradle.kts – Prettier ignores .kts on the grounds that ktlint owns
  // them, so a root project without the plugin leaves the two checked by nothing.
  id("org.jlleitschuh.gradle.ktlint") version "14.2.0"
  id("dev.detekt") version "2.0.0-alpha.6" apply false

  // JUnit 5 for the JVM tests. Android's own instrumented tests stay on JUnit 4,
  // because that is what Compose's testing library is built on.
  id("de.mannodermaus.android-junit5") version "2.0.1" apply false
}

// The same ktlint :app runs, rather than the plugin's own default: two versions in one
// build would hold this file and the app's sources to two different rule sets, and
// which version runs is a decision, not a plugin release's to make (ADR 004).
ktlint {
  version.set("1.8.0")
  ignoreFailures.set(false)
}

// Build output leaves the source tree, so a build adds nothing untracked beside the
// sources.
allprojects {
  layout.buildDirectory = rootProject.layout.projectDirectory.dir(".build/${project.name}")
}
