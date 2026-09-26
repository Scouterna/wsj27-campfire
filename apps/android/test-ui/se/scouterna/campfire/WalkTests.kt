package se.scouterna.campfire

import androidx.lifecycle.Lifecycle
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Launches the real shell and asks whether its activity resumed – enough to prove the
 * instrumented test target builds, installs, and drives the app.
 */
@RunWith(AndroidJUnit4::class)
class WalkTests {
  @get:Rule
  val activity = ActivityScenarioRule(MainActivity::class.java)

  @Test
  fun theShellLaunches() {
    assertEquals(Lifecycle.State.RESUMED, activity.scenario.state)
  }
}
