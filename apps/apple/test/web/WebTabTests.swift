import Foundation
import Testing
@testable import Campfire

@Suite("a tab")
@MainActor
struct WebTabTests {
  private let origin = URL(string: "http://localhost:8000")!

  @Test
  func `starts the sign-in webview with no round trip under way`() {
    let tab = WebTab(id: "sign-in", path: "/", origin: origin, isSignIn: true) { _ in }
    #expect(tab.roundTrip == nil)
  }

  @Test
  func `covers the sign-in webview again when the round trip comes back`() throws {
    let tab = WebTab(id: "sign-in", path: "/", origin: origin, isSignIn: true) { _ in }
    tab.receive(.signedOut)
    #expect(!tab.isCovered)
    try tab.roundTripDidReturn(to: #require(URL(string: "http://localhost:8000/")))
    #expect(tab.isCovered)
    #expect(tab.roundTrip == nil)
  }

  @Test
  func `leaves the sign-in screen showing when the round trip is closed`() {
    let tab = WebTab(id: "sign-in", path: "/", origin: origin, isSignIn: true) { _ in }
    tab.receive(.signedOut)
    tab.roundTripDidEnd()
    #expect(!tab.isCovered)
    #expect(tab.roundTrip == nil)
  }

  @Test
  func `keeps a screen it is told, and its full-screen state`() {
    let tab = WebTab(id: "home", path: "/", origin: origin) { _ in }
    var screen = Screen(title: "Karta", canGoBack: true, actions: [], menu: [])
    screen.fullScreen = true
    tab.receive(.screen(screen))
    #expect(tab.screen == screen)
    #expect(tab.hasScreen)
  }

  @Test
  func `keeps the sign-in webview covered until the page says nobody is signed in`() {
    let tab = WebTab(id: "sign-in", path: "/", origin: origin, isSignIn: true) { _ in }
    #expect(tab.isCovered)
    tab.receive(.theme("red"))
    #expect(tab.isCovered)
    tab.receive(.signedOut)
    #expect(!tab.isCovered)
  }

  @Test
  func `knows its own address whatever the query, and nothing else`() throws {
    let tab = WebTab(id: "sign-in", path: "/", origin: origin, isSignIn: true) { _ in }
    #expect(try tab.isOwnAddress(#require(URL(string: "http://localhost:8000/?code=1#top"))))
    #expect(try tab.isOwnAddress(#require(URL(string: "http://localhost:8000"))))
    #expect(try !tab.isOwnAddress(#require(URL(string: "http://localhost:8000/api/auth/login"))))
    #expect(try !tab.isOwnAddress(#require(URL(string: "https://localhost:8000/"))))
  }
}
