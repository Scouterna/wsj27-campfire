import XCTest

/// Launches the real shell and asks whether it drew its one screen – enough to prove the
/// UI test target builds, installs, and drives the app.
///
/// `@MainActor` because every XCUI type is isolated to it, while an XCTestCase method is
/// synchronous and nonisolated.
@MainActor
final class WalkTests: XCTestCase {
  private let timeout: TimeInterval = 30

  func testWalksTheShell() {
    let app = XCUIApplication()
    app.launch()

    let title = app.staticTexts["Campfire"]
    XCTAssertTrue(title.waitForExistence(timeout: timeout), "the shell's one screen")
  }
}
