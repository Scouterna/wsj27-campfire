package se.scouterna.campfire

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

@DisplayName("a section")
class SectionTests {
  @Test
  fun `draws a known icon name as its own glyph`() {
    assertNotEquals(Section.icon("rocket"), Section.icon("participants"))
  }

  @Test
  fun `draws an icon name it does not know as the neutral shape`() {
    assertEquals(Section.icon("rocket"), Section.icon("unicorn"))
  }
}
