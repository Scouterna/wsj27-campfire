plugins {
  id("com.android.application")
  id("org.jetbrains.kotlin.plugin.compose")
  id("org.jlleitschuh.gradle.ktlint")
  id("dev.detekt")
  id("de.mannodermaus.android-junit5")
}

android {
  namespace = "se.scouterna.campfire"
  compileSdk = 37

  defaultConfig {
    applicationId = "se.scouterna.campfire"
    minSdk = 30
    targetSdk = 36
    // The shell's version lives in its own git tag rather than the tree, and the build
    // never reads git, so a release passes -Pcampfire.version and -Pcampfire.build and
    // any other build is 0.0.0 build 1.
    versionCode =
      providers
        .gradleProperty("campfire.build")
        .map { it.toIntOrNull() ?: error("campfire.build must be a whole number, got \"$it\"") }
        .getOrElse(1)
    versionName = providers.gradleProperty("campfire.version").getOrElse("0.0.0")

    testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
  }

  // The environments differ in one setting, the origin the shell loads the web
  // application from. They share an applicationId, so installing one replaces another –
  // the accepted cost of not maintaining an identity per environment for a difference
  // that is one URL.
  flavorDimensions += "stage"

  productFlavors {
    create("local") {
      // The default, so `assemble` and the IDE's own run button mean the same thing
      // `pnpm start:android` does.
      isDefault = true
      dimension = "stage"
      // The web application on this machine, at the one origin every stack serves,
      // which scripts/android/start.sh maps from the device with `adb reverse`.
      //
      // localhost rather than the emulator's 10.0.2.2 alias, because a session's cookies
      // do not cross between spellings of one machine and ScoutID returns only to this
      // host name.
      buildConfigField("String", "CAMPFIRE_WEB_ORIGIN", "\"http://localhost:8000\"")
    }

    create("dev") {
      dimension = "stage"
      // The deployed development build of the web application.
      buildConfigField("String", "CAMPFIRE_WEB_ORIGIN", "\"https://campfire.wsj27.scouterna.net\"")
    }

    create("prod") {
      dimension = "stage"
      // The deployed production build of the web application. The shell itself stays a
      // debuggable build with no signing configuration, because how Campfire reaches a
      // device is undecided.
      buildConfigField("String", "CAMPFIRE_WEB_ORIGIN", "\"https://campfire.wsj27.se\"")
    }
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_21
    targetCompatibility = JavaVersion.VERSION_21
  }

  buildFeatures {
    compose = true
    buildConfig = true
  }

  // Android Lint knows things neither ktlint nor Detekt does – API levels, manifest
  // mistakes, resource problems. A warning is a failure here, as everywhere else in this
  // repository (ADR 006).
  lint {
    warningsAsErrors = true
    abortOnError = true

    disable +=
      setOf(
        // The target API level changes behavior, so it moves deliberately rather than
        // whenever a newer one exists.
        "OldTargetApi",
        // Dependency versions are pinned exactly and updated deliberately rather than
        // whenever a newer release exists (ADR 005).
        "GradleDependency",
        "AndroidGradlePluginVersion",
        "NewerVersionAvailable",
      )
  }

  testOptions {
    unitTests {
      isIncludeAndroidResources = true
      // The android.jar on a unit test's classpath is stubs that throw. Returning a
      // default instead lets a test construct a type that merely mentions the platform.
      isReturnDefaultValues = true
    }
  }

  // config/, assets/, and src/ mean the same thing in every app here, so the Android
  // source sets are remapped onto them rather than the other way round.
  sourceSets {
    getByName("test") {
      kotlin.directories.add("../../test")
    }

    getByName("androidTest") {
      kotlin.directories.add("../../test-ui")
    }

    getByName("main") {
      manifest.srcFile("../../config/AndroidManifest.xml")
      res.directories.add("../../assets")
      kotlin.directories.add("../../src")
    }
  }
}

// ktlint owns formatting. Its rules come from the repository's .editorconfig, which it
// finds by walking up from each source file – the reason that file sits at the root
// rather than under config/ with everything else.
ktlint {
  version.set("1.8.0")
  ignoreFailures.set(false)
  filter {
    // Generated sources are not ours to format.
    exclude { it.file.path.contains("/.build/") }
  }
}

// Detekt owns code smells. Layered on its defaults, so a rule added in a future release
// arrives switched on rather than silently absent.
detekt {
  config.setFrom(files("../../../../config/detekt/detekt.yml"))
  buildUponDefaultConfig = true
  ignoreFailures = false
  source.setFrom(files("../../src", "../../test", "../../test-ui"))
}

dependencies {
  implementation(platform("androidx.compose:compose-bom:2026.08.00"))
  implementation("androidx.compose.material3:material3")
  implementation("androidx.compose.ui:ui")
  implementation("androidx.compose.ui:ui-graphics")

  implementation("androidx.activity:activity-compose:1.13.0")
  implementation("androidx.core:core-ktx:1.19.0")

  testImplementation("org.junit.jupiter:junit-jupiter:6.1.3")
  testRuntimeOnly("org.junit.platform:junit-platform-launcher")

  androidTestImplementation(platform("androidx.compose:compose-bom:2026.08.00"))
  androidTestImplementation("androidx.compose.ui:ui-test-junit4")
  androidTestImplementation("androidx.test.ext:junit:1.3.0")
  androidTestImplementation("androidx.test.espresso:espresso-core:3.7.0")
  debugImplementation("androidx.compose.ui:ui-test-manifest")
}
