import XCTest

/// Walks the real shell against a running stack: sign-in through the mock's persona
/// picker, the tabs, a scroll under the large title, a push and the back button, the
/// overflow menu, the avatar, both orientations, and signing out. Each stop attaches a screenshot,
/// because what this proves is mostly how the chrome looks, which no assertion reads.
///
/// The interactive back swipe stays a manual check, because the edge gesture cannot be
/// synthesized.
///
/// `@MainActor` because every XCUI type is isolated to it, while an XCTestCase method is
/// synchronous and nonisolated.
@MainActor
final class WalkTests: XCTestCase {
  private let timeout: TimeInterval = 30
  private var app = XCUIApplication()

  override func setUp() async throws {
    continueAfterFailure = false
  }

  override func tearDown() async throws {
    XCUIDevice.shared.orientation = .portrait
  }

  func testWalksTheShell() throws {
    app.launch()
    try signIn()

    let tabBar = app.tabBars.firstMatch
    XCTAssertTrue(tabBar.waitForExistence(timeout: timeout), "the tab bar after sign-in")
    settle()
    snap("01 home")

    // The second section – the list of participants, for the persona the walk signs in.
    let tabs = tabBar.buttons
    XCTAssertGreaterThan(tabs.count, 1, "more than one section")
    tabs.element(boundBy: 1).tap()
    settle()
    snap("02 second tab")

    let page = app.webViews.firstMatch
    page.swipeUp(velocity: .slow)
    settle()
    snap("03 scrolled, title collapsed")

    // The active tab again: the scrolled page settles to its top.
    tabs.element(boundBy: 1).tap()
    settle()
    snap("04 reselected, back at the top")

    if app.buttons["shell.more"].exists {
      app.buttons["shell.more"].tap()
      settle()
      snap("05 overflow menu")
      // Outside the menu, to close it without choosing.
      app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.9)).tap()
      settle()
    }

    walkAPush(on: page)

    rotate(.landscapeRight)
    snap("12 list in landscape")
    rotate(.portrait)

    walkTheProfile(tabBar: tabBar)
  }

  /// Pushes the list's first row, scrolls it in both orientations, and pops it.
  private func walkAPush(on page: XCUIElement) {
    let row = page.links.element(boundBy: 0)
    if row.waitForExistence(timeout: timeout) {
      row.tap()
      XCTAssertTrue(app.buttons["shell.back"].waitForExistence(timeout: timeout), "back")
      settle()
      snap("06 pushed")
      page.swipeUp(velocity: .slow)
      settle()
      snap("07 pushed, scrolled")

      rotate(.landscapeLeft)
      snap("08 landscape")
      page.swipeUp(velocity: .slow)
      settle()
      snap("09 landscape, scrolled")
      rotate(.portrait)
      snap("10 portrait again")

      app.buttons["shell.back"].tap()
      settle()
      snap("11 popped")
    }
  }

  /// Opens the profile from the avatar, and signs out there.
  private func walkTheProfile(tabBar: XCUIElement) {
    let avatar = app.buttons["shell.profile"]
    XCTAssertTrue(avatar.waitForExistence(timeout: timeout), "the avatar")
    avatar.tap()
    settle()
    snap("13 profile")
    XCTAssertFalse(app.buttons["shell.profile"].exists, "no avatar on the profile itself")

    // The profile's one button signs out, which takes the tabs down and returns to the
    // sign-in webview.
    let signOut = app.webViews.firstMatch.buttons.firstMatch
    XCTAssertTrue(signOut.waitForExistence(timeout: timeout), "the profile's way out")
    signOut.tap()
    XCTAssertTrue(tabBar.waitForNonExistence(timeout: timeout), "no tabs once signed out")
    settle()
    snap("14 signed out")
  }

  /// Signs in through whichever screen the shell opened on: the mock's persona picker
  /// after the sign-in screen, or nothing when a session survived from an earlier run.
  private func signIn() throws {
    let page = app.webViews.firstMatch
    XCTAssertTrue(page.waitForExistence(timeout: timeout), "a webview")
    if app.tabBars.firstMatch.waitForExistence(timeout: 3) {
      return
    }
    let button = page.buttons.firstMatch
    XCTAssertTrue(button.waitForExistence(timeout: timeout), "the sign-in button")
    button.tap()
    // A management persona, because the management sees the whole contingent and so
    // every bar item the list of participants offers.
    let persona = page.links.matching(NSPredicate(format: "label CONTAINS 'CMT'")).firstMatch
    XCTAssertTrue(persona.waitForExistence(timeout: timeout), "the persona picker")
    persona.tap()
  }

  /// Long enough for a page to report and a bar to animate.
  private func settle() {
    Thread.sleep(forTimeInterval: 1.5)
  }

  /// Turns the device and waits out the rotation.
  private func rotate(_ orientation: UIDeviceOrientation) {
    XCUIDevice.shared.orientation = orientation
    Thread.sleep(forTimeInterval: 3)
  }

  private func snap(_ name: String) {
    // The screen rather than the app, because an app's screenshot in landscape comes back
    // cropped to the portrait frame.
    let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
  }
}
