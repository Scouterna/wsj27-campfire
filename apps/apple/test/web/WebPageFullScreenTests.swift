import Testing
import UIKit
@testable import Campfire

@Suite("filling the screen")
@MainActor
struct WebPageFullScreenTests {
  @Test
  func `does not glide to where the offset already is`() {
    let scroll = UIScrollView()
    let glide = OffsetGlide()
    glide.move(scroll, to: scroll.contentOffset, duration: 0.3)
    #expect(!glide.isMoving)
  }

  @Test
  func `ends at once where there is nowhere to glide`() {
    let scroll = UIScrollView()
    let glide = OffsetGlide()
    var hasEnded = false
    glide.move(scroll, to: scroll.contentOffset, duration: 0.3) { hasEnded = true }
    #expect(hasEnded)
  }

  @Test
  func `never ends a glide that was stopped`() {
    let scroll = UIScrollView()
    scroll.contentOffset = CGPoint(x: 0, y: -120)
    let glide = OffsetGlide()
    var hasEnded = false
    glide.move(scroll, to: .zero, duration: 0.3) { hasEnded = true }
    glide.stop()
    #expect(!hasEnded)
  }

  @Test
  func `glides until stopped, leaving the offset where it is`() {
    let scroll = UIScrollView()
    scroll.contentOffset = CGPoint(x: 0, y: -120)
    let glide = OffsetGlide()
    glide.move(scroll, to: .zero, duration: 0.3)
    #expect(glide.isMoving)
    glide.stop()
    #expect(!glide.isMoving)
    #expect(scroll.contentOffset == CGPoint(x: 0, y: -120))
  }

  @Test
  func `freezes the insets while the page fills the screen and hands them back after`() throws {
    let controller = WebPageController()
    let navigation = UINavigationController(rootViewController: controller)
    navigation.loadViewIfNeeded()
    let tab = WebTab(
      id: "home",
      path: "/",
      origin: URL(fileURLWithPath: "/"),
    ) { _ in }
    tab.activate()
    controller.attach(tab: tab)
    let scroll = try #require(tab.webView?.scrollView)

    controller.fillScreen(true)
    #expect(controller.fillsScreen)
    #expect(scroll.contentInsetAdjustmentBehavior == .never)
    #expect(navigation.navigationBar.isHidden)

    controller.fillScreen(false)
    #expect(!controller.fillsScreen)
    #expect(scroll.contentInsetAdjustmentBehavior == .automatic)
    #expect(!navigation.navigationBar.isHidden)
  }

  @Test
  func `keeps the bars away until the document is back where it rested`() throws {
    let controller = WebPageController()
    let navigation = UINavigationController(rootViewController: controller)
    navigation.loadViewIfNeeded()
    let tab = WebTab(
      id: "home",
      path: "/",
      origin: URL(fileURLWithPath: "/"),
    ) { _ in }
    tab.activate()
    controller.attach(tab: tab)
    let scroll = try #require(tab.webView?.scrollView)

    controller.fillScreen(true)
    // Where a page resting below the bars had the document before filling the screen.
    controller.fullScreenOffset = CGPoint(x: 0, y: -120)

    controller.fillScreen(false)
    #expect(controller.offsetGlide.isMoving)
    #expect(scroll.contentInsetAdjustmentBehavior == .never)
    #expect(navigation.navigationBar.isHidden)
  }
}
