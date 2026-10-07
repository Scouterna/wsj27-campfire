import SwiftUI
import UIKit
import WebKit

/// One tab's navigation bar, hosted in UIKit.
///
/// A real `UINavigationController` is what makes the large title native: the webview
/// underlaps the bar, its scroll view drives the collapse, and the title moves between
/// large and inline as the platform moves it. SwiftUI's stack cannot be driven by a
/// `WKWebView`'s scrolling.
///
/// Nothing is ever pushed onto the stack. The web owns the history, so the stack has no
/// back gesture of its own to fight the page controller's.
@MainActor
enum WebStack {
  /// A stack holding one page controller, with nothing attached yet.
  static func make() -> UINavigationController {
    let navigation = UINavigationController(rootViewController: WebPageController())
    navigation.navigationBar.prefersLargeTitles = true
    return navigation
  }

  /// Show what a tab's page last reported in its stack. Called on every change to any
  /// tab, so each step changes only what differs.
  ///
  /// - Parameters:
  ///   - navigation: a stack from `make()`
  ///   - tab: the tab whose webview the stack hosts
  ///   - profile: who is signed in, for the avatar
  ///   - theme: the theme the controls wear
  static func update(
    _ navigation: UINavigationController,
    tab: WebTab,
    profile: Profile?,
    theme: Palette.Theme,
  ) {
    guard let root = navigation.viewControllers.first as? WebPageController else { return }

    let screen = tab.screen
    root.attach(tab: tab)
    tab.pageController = root
    root.setOverlay(isShown: !tab.hasScreen || tab.error != nil)

    let ink = UIColor(theme.ink)
    if navigation.navigationBar.tintColor != ink {
      navigation.navigationBar.tintColor = ink
    }

    // No avatar before the page has reported, because what it sends reaches only a
    // page that has drawn, and none on the profile itself, where it would lead nowhere.
    // The webview's address follows the page's pushState, so the shell can read where
    // the web is without asking.
    let avatar = profile.flatMap { profile in
      tab.hasReported && tab.webView?.url?.path() != profile.path ? profile : nil
    }
    root.show(Bar(screen: screen, avatar: avatar, ink: ink))
    root.fillScreen(screen.fullScreen)
  }
}

/// What the navigation bar shows for one screen, compared as a value so that only what
/// changed is rebuilt – replacing an item re-forms the bar's glass even when it draws the
/// same thing.
struct Bar: Equatable {
  /// Empty until the page has named itself, because a section's start screen may call
  /// itself something other than its tab, and only the page knows what.
  let title: String
  let canGoBack: Bool
  let trailing: Trailing

  /// The theme's ink, which the controls and the large title wear.
  var ink: UIColor {
    trailing.ink
  }

  /// What the trailing items are built from.
  struct Trailing: Equatable {
    let actions: [ScreenItem]
    let avatar: Profile?
    let ink: UIColor
    let menu: [[ScreenItem]]
  }

  init(screen: Screen, avatar: Profile?, ink: UIColor) {
    title = screen.title
    canGoBack = screen.canGoBack
    trailing = Trailing(actions: screen.actions, avatar: avatar, ink: ink, menu: screen.menu)
  }

  /// The back button, or nil where there is nothing to go back to.
  @MainActor
  func backItem(for tab: WebTab) -> UIBarButtonItem? {
    guard canGoBack else { return nil }
    let back = UIBarButtonItem(
      image: UIImage(systemName: "chevron.backward"),
      primaryAction: UIAction { [weak tab] _ in tab?.goBack() },
    )
    // UIKit names a standard back button after the screen behind it. This one is built
    // by hand, so its name is too.
    back.accessibilityLabel = String(localized: "shell.back")
    back.accessibilityIdentifier = "shell.back"
    return back
  }

  /// The trailing items, outermost first: the avatar, the overflow menu, and the primary
  /// actions.
  @MainActor
  func trailingItems(for tab: WebTab) -> [UIBarButtonItem] {
    var items: [UIBarButtonItem] = []

    if let profile = trailing.avatar {
      items.append(Self.profileItem(profile, ink: ink, tab: tab))
    }

    if !trailing.menu.isEmpty {
      let groups = trailing.menu.map { group in
        UIMenu(options: .displayInline, children: group.map { Self.menuElement($0, tab: tab) })
      }
      let more = UIBarButtonItem(
        image: UIImage(systemName: "ellipsis"),
        menu: UIMenu(children: groups),
      )
      more.accessibilityLabel = String(localized: "shell.more")
      more.accessibilityIdentifier = "shell.more"
      items.append(more)
    }

    for action in trailing.actions.reversed() {
      // The label rather than the icon, as a bar's primary action reads on iPhone.
      let item = UIBarButtonItem(
        title: action.label,
        primaryAction: UIAction { [weak tab] _ in tab?.perform(action.id) },
      )
      item.style = .prominent
      item.tintColor = ink
      item.accessibilityIdentifier = "shell.action.\(action.id)"
      items.append(item)
    }
    return items
  }

  @MainActor
  private static func menuElement(_ item: ScreenItem, tab: WebTab) -> UIMenuElement {
    let action = UIAction(
      title: item.label,
      subtitle: item.unavailable,
      image: item.icon.flatMap { UIImage(systemName: Section.symbol(for: $0)) },
    ) { [weak tab] _ in tab?.perform(item.id) }
    if item.unavailable != nil {
      action.attributes = .disabled
    }
    return action
  }

  /// The avatar: the signed-in person's picture, or their initials in a filled circle,
  /// opening the profile.
  @MainActor
  private static func profileItem(
    _ profile: Profile,
    ink: UIColor,
    tab: WebTab,
  ) -> UIBarButtonItem {
    let button = UIButton(type: .custom)
    if let picture = profile.avatarData.flatMap(UIImage.init(data:)) {
      // The picture is round on its own, so nothing is painted behind it.
      button.setImage(picture, for: .normal)
      button.contentHorizontalAlignment = .fill
      button.contentVerticalAlignment = .fill
    } else {
      button.setTitle(profile.initials, for: .normal)
      button.titleLabel?.font = .systemFont(ofSize: 15, weight: .bold)
      button.setTitleColor(.white, for: .normal)
      button.backgroundColor = ink
    }
    // Round whatever the button holds, because the bar draws its press and its leaving
    // over the button's whole bounds, which would show as a square around the circle.
    button.layer.cornerRadius = 17
    button.clipsToBounds = true
    // Constraints rather than a frame, because the bar lays custom views out with Auto
    // Layout and stretches an unconstrained one into a lens.
    button.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.activate([
      button.widthAnchor.constraint(equalToConstant: 34),
      button.heightAnchor.constraint(equalToConstant: 34),
    ])
    button.addAction(UIAction { [weak tab] _ in tab?.open(profile.path) }, for: .touchUpInside)
    // The avatar pictures a person rather than names the control, so it has its own.
    button.accessibilityLabel = String(localized: "shell.profile")
    button.accessibilityIdentifier = "shell.profile"
    return UIBarButtonItem(customView: button)
  }
}

extension Bar {
  /// Bravely Script for the large title only, scaled with Dynamic Type as the system's own
  /// large title is. The inline title it collapses into stays the system face – the same
  /// split the web makes between display and body text. UIKit draws a large title on one
  /// line and cuts what does not fit, so a long one steps down in size until it fits,
  /// rather than losing the end of a name.
  ///
  /// - Parameters:
  ///   - available: the width the bar leaves the title, inside its margins
  ///   - traits: the text size to scale for
  /// - Returns: The attributes for the bar's large title.
  func largeTitleAttributes(
    within available: CGFloat,
    traits: UITraitCollection,
  ) -> [NSAttributedString.Key: Any] {
    guard let face = UIFont(name: "BravelyScript-Regular", size: 40) else {
      return [.foregroundColor: ink]
    }
    let font = UIFontMetrics(forTextStyle: .largeTitle)
      .scaledFont(for: face, compatibleWith: traits)
    let width = (title as NSString).size(withAttributes: [.font: font]).width
    // Never below this share of the size, where a title would stop reading as one; a
    // name longer than that is cut.
    let fit = width > available ? max(0.6, available / width) : 1
    return [.font: font.withSize((font.pointSize * fit).rounded(.down)), .foregroundColor: ink]
  }
}
