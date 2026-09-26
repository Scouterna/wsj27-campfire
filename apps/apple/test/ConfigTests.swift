import Foundation
import Testing
@testable import Campfire

@Suite("the configuration")
struct ConfigTests {
  @Test
  func `reads the web origin the build settings put in the Info.plist`() {
    // A break anywhere between the xcconfig, the generated plist, and the source leaves
    // the shell nowhere to load from. The tests always run the Local scheme, whose origin
    // is this machine.
    #expect(Config.webOrigin.scheme == "http")
    #expect(Config.webOrigin.host() == "localhost")
  }
}
