package se.scouterna.campfire

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

@DisplayName("the configuration")
class ConfigTests {
  @Test
  fun `reads the web origin the build settings put in BuildConfig`() {
    // A break anywhere between the product flavor, the generated BuildConfig, and the
    // source leaves the shell nowhere to load from. The tests always run the local
    // flavor, whose origin is this machine.
    assertEquals("http://localhost:8000", Config.webOrigin)
  }
}
