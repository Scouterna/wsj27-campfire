import Testing
@testable import Campfire

@Suite("the palette")
struct PaletteTests {
  @Test
  func `maps a theme name to its own colors`() {
    #expect(Palette.theme(named: "brown") != Palette.blue)
  }

  @Test
  func `falls back to blue for a name it does not know`() {
    #expect(Palette.theme(named: "purple") == Palette.blue)
  }
}
