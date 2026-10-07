import Testing
@testable import Campfire

@Suite("a section")
struct SectionTests {
  @Test
  func `draws a known icon name as its symbol`() {
    #expect(Section.symbol(for: "participants") == "person.2")
  }

  @Test
  func `draws an icon name it does not know as the neutral shape`() {
    #expect(Section.symbol(for: "rocket") == "circle")
  }
}
