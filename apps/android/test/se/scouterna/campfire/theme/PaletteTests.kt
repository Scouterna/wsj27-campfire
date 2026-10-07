package se.scouterna.campfire.theme

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

@DisplayName("the palette")
class PaletteTests {
  @Test
  fun `maps a theme name to its own colors`() {
    assertNotEquals(Palette.blue, Palette.theme("brown"))
  }

  @Test
  fun `falls back to blue for a name it does not know`() {
    assertEquals(Palette.blue, Palette.theme("purple"))
  }
}
