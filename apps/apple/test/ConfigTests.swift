import Foundation
import Testing
@testable import Campfire

@Suite("the configuration")
struct ConfigTests {
  @Test
  func `reads the web origin the build settings put in the Info.plist`() {
    // The whole path from an xcconfig, through the generated plist, to the source. If any
    // link in it breaks, the shell has nowhere to load from. The tests always run the
    // Local environment, whose origin is this machine.
    #expect(Config.webOrigin.scheme == "http")
    #expect(Config.webOrigin.host() == "localhost")
  }
}
