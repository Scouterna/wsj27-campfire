package se.scouterna.campfire

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

@DisplayName("the configuration")
class ConfigTests {
  @Test
  fun `reads the web origin the build settings put in BuildConfig`() {
    // The whole path from a product flavor, through the generated BuildConfig, to the
    // source. If any link in it breaks, the shell has nowhere to load from. The unit
    // tests always run the local flavor, whose origin is the local ingress on the
    // adb-reversed localhost.
    assertEquals("http://localhost:8000", Config.webOrigin)
  }
}
