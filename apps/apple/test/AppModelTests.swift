import Foundation
import Testing
@testable import Campfire

@Suite("the app model")
@MainActor
struct AppModelTests {
  private let origin = URL(string: "http://localhost:8000")!
  private let profile = Profile(initials: "KK", path: "/profile")
  private let home = Section(id: "home", label: "Hem", path: "/", icon: "home")
  private let people = Section(
    id: "participants",
    label: "Deltagare",
    path: "/participants",
    icon: "participants",
  )

  @Test
  func `starts at the sign-in webview with no tabs`() {
    let model = AppModel(origin: origin)
    #expect(model.signIn != nil)
    #expect(model.tabs.isEmpty)
  }

  @Test
  func `builds a tab per section once signed in, and drops the sign-in webview`() {
    let model = AppModel(origin: origin)
    model.receive(.signedIn(sections: [home, people], profile: profile))
    #expect(model.signIn == nil)
    #expect(model.tabs.map(\.id) == ["home", "participants"])
    #expect(model.activeSectionId == "home")
  }

  @Test
  func `keeps its tabs when the same sections are reported again`() {
    let model = AppModel(origin: origin)
    model.receive(.signedIn(sections: [home, people], profile: profile))
    let first = model.tabs
    model.activeSectionId = "participants"
    model.receive(.signedIn(sections: [home, people], profile: profile))
    #expect(model.tabs.map(ObjectIdentifier.init) == first.map(ObjectIdentifier.init))
    #expect(model.activeSectionId == "participants")
  }

  @Test
  func `returns to the sign-in webview once signed out`() {
    let model = AppModel(origin: origin)
    model.receive(.signedIn(sections: [home], profile: profile))
    model.receive(.signedOut)
    #expect(model.signIn != nil)
    #expect(model.tabs.isEmpty)
    #expect(model.profile == nil)
  }

  @Test
  func `keeps the last theme once signed out, for the sign-in screen's launch surface`() {
    let model = AppModel(origin: origin)
    model.receive(.signedIn(sections: [home], profile: profile))
    model.receive(.theme("yellow"))
    model.receive(.signedOut)
    #expect(model.theme == Palette.theme(named: "yellow"))
  }

  @Test
  func `wears the theme the web names`() {
    let model = AppModel(origin: origin)
    model.receive(.theme("red"))
    #expect(model.theme == Palette.theme(named: "red"))
  }

  @Test
  func `wears the remembered theme until the web names one`() {
    let model = AppModel(origin: origin, rememberedTheme: "red")
    #expect(model.theme == Palette.theme(named: "red"))
  }

  @Test
  func `passes on a theme only when it changes`() {
    var named: [String] = []
    let model = AppModel(origin: origin, rememberedTheme: "red") { named.append($0) }
    model.receive(.theme("red"))
    model.receive(.theme("green"))
    model.receive(.theme("green"))
    #expect(named == ["green"])
  }
}
