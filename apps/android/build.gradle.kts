plugins {
  id("com.android.application") version "9.4.0" apply false
  id("org.jetbrains.kotlin.plugin.compose") version "2.4.10" apply false

  // Style and code quality run as Gradle plugins rather than binaries on the developer's
  // machine, so the checks need nothing but a JDK and run on any continuous integration
  // runner.
  //
  // ktlint is applied to the root project too, because Prettier leaves .kts files to
  // ktlint and the root build scripts would otherwise be checked by nothing.
  id("org.jlleitschuh.gradle.ktlint") version "14.2.0"
  id("dev.detekt") version "2.0.0-alpha.6" apply false

  // JUnit 5 for the JVM tests. Android's own instrumented tests stay on JUnit 4,
  // because that is what Compose's testing library is built on.
  id("de.mannodermaus.android-junit5") version "2.0.1" apply false
}

// The same ktlint :app runs rather than the plugin's default, because two versions in
// one build would hold this file and the app's sources to different rule sets, and
// which version runs is a decision rather than a plugin release's to make (ADR 005).
ktlint {
  version.set("1.8.0")
  ignoreFailures.set(false)
}

// Build output leaves the source tree, so a build adds nothing untracked beside the
// sources.
allprojects {
  layout.buildDirectory = rootProject.layout.projectDirectory.dir(".build/${project.name}")
}
