import Foundation
import Testing
import UIKit
@testable import Campfire

@Suite("the navigation bar")
@MainActor
struct BarTests {
  private let action = ScreenItem(id: "primary", label: "Avdelningar", icon: nil, unavailable: nil)
  private let profile = Profile(initials: "KK", path: "/profile")

  private func screen(_ title: String, actions: [ScreenItem] = []) -> Screen {
    Screen(title: title, canGoBack: true, actions: actions, menu: [])
  }

  @Test
  func `keeps its items when only the title changes`() {
    let list = Bar(screen: screen("Deltagare", actions: [action]), avatar: profile, ink: .red)
    let person = Bar(screen: screen("Leo Ström", actions: [action]), avatar: profile, ink: .red)
    #expect(list != person)
    #expect(list.trailing == person.trailing)
    #expect(list.canGoBack == person.canGoBack)
  }

  @Test
  func `rebuilds its items when what they show changes`() {
    let bar = Bar(screen: screen("Deltagare", actions: [action]), avatar: profile, ink: .red)
    #expect(bar.trailing != Bar(screen: screen("Deltagare"), avatar: profile, ink: .red).trailing)
    #expect(
      bar.trailing != Bar(screen: screen("Deltagare", actions: [action]), avatar: nil, ink: .red)
        .trailing,
    )
    #expect(
      bar.trailing
        != Bar(screen: screen("Deltagare", actions: [action]), avatar: profile, ink: .blue)
        .trailing,
    )
  }

  @Test
  func `draws the avatar outermost and a back button only where there is a way back`() throws {
    let tab = try WebTab(
      id: "home",
      path: "/",
      origin: #require(URL(string: "http://localhost:8000")),
    ) { _ in }
    let bar = Bar(screen: screen("Deltagare", actions: [action]), avatar: profile, ink: .red)
    let items = bar.trailingItems(for: tab)
    #expect(items.map { $0.customView?.accessibilityIdentifier ?? $0.accessibilityIdentifier } == [
      "shell.profile",
      "shell.action.primary",
    ])
    #expect(bar.backItem(for: tab) != nil)
    let root = Bar(
      screen: Screen(title: "Hem", canGoBack: false, actions: [], menu: []),
      avatar: nil,
      ink: .red,
    )
    #expect(root.backItem(for: tab) == nil)
  }
}
