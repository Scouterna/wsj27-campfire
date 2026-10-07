import Foundation

/// Everything the shell holds while it runs: the sign-in webview or the tabs, which tab
/// is showing, who is signed in, and the theme they wear.
///
/// The session itself lives in the shared cookie jar, never here, so a relaunch asks the
/// web again and lands wherever the web's own gate does.
@MainActor
@Observable
final class AppModel {
  /// The one full-screen webview shown while nobody is signed in. Dropped once someone
  /// is, so no tab's history can reach the sign-in screen.
  private(set) var signIn: WebTab?
  private(set) var sections: [Section] = []
  private(set) var tabs: [WebTab] = []
  private(set) var profile: Profile?
  private(set) var theme: Palette.Theme
  var activeSectionId = ""

  private let origin: URL
  private let onTheme: (String) -> Void

  /// - Parameters:
  ///   - origin: the web application's origin
  ///   - rememberedTheme: the name of the theme the last session wore, worn from the
  ///     first frame of this one
  ///   - onTheme: called with the name of each theme the web names that differs from
  ///     the one worn
  init(
    origin: URL,
    rememberedTheme: String? = nil,
    onTheme: @escaping (String) -> Void = { _ in },
  ) {
    self.origin = origin
    self.onTheme = onTheme
    theme = rememberedTheme.map(Palette.theme(named:)) ?? Palette.blue
    signIn = makeSignIn()
  }

  /// The tab a section is showing, if it has one.
  func tab(for section: Section) -> WebTab? {
    tabs.first { $0.id == section.id }
  }

  /// The tab the tab bar is showing.
  var activeTab: WebTab? {
    tabs.first { $0.id == activeSectionId }
  }

  /// Take a session or theme report from any webview. Internal so a test can report
  /// what a page would.
  func receive(_ message: ToShell) {
    switch message {
      case let .signedIn(sections, profile):
        signedIn(sections, profile: profile)
      case .signedOut:
        signedOut()
      case let .theme(name):
        wear(name)
      case .screen:
        // A screen belongs to the tab that reported it, which keeps it.
        break
    }
  }

  private func wear(_ name: String) {
    let named = Palette.theme(named: name)
    guard named != theme else { return }
    theme = named
    onTheme(name)
  }

  private func makeSignIn() -> WebTab {
    // The address is the start screen, because the web's gate shows sign-in at any
    // address and the start screen at this one once the round trip returns.
    WebTab(id: "sign-in", path: "/", origin: origin, isSignIn: true) { [weak self] message in
      self?.receive(message)
    }
  }

  private func signedIn(_ reported: [Section], profile: Profile) {
    self.profile = profile

    // Every page reports the session, so this is usually the same set again. A label
    // can change in place; a set with other sections or addresses rebuilds the tabs.
    let isSameSet = reported.map { [$0.id, $0.path] } == sections.map { [$0.id, $0.path] }
    if signIn == nil, isSameSet {
      sections = reported
      return
    }

    sections = reported
    // The tabs are built from what the session allowed, each with an empty history. The
    // sign-in webview is dropped rather than promoted into a tab, so a back gesture
    // cannot reach it; what it established survives in the shared cookie jar.
    let kept = Dictionary(uniqueKeysWithValues: tabs.map { ($0.id, $0) })
    tabs = reported.map { section in
      if let tab = kept[section.id], tab.url.path() == section.path {
        return tab
      }
      return WebTab(id: section.id, path: section.path, origin: origin) { [weak self] message in
        self?.receive(message)
      }
    }
    // Every tab loads now, off screen, so a first switch shows a rendered page rather
    // than a load. Android builds a tab's webview when it is first shown instead.
    for tab in tabs {
      tab.activate()
    }
    if !tabs.contains(where: { $0.id == activeSectionId }) {
      activeSectionId = reported[0].id
    }
    signIn = nil
  }

  private func signedOut() {
    // The sign-in webview reports this on every load while nobody is signed in.
    guard signIn == nil else { return }
    // The tabs leave as a picture that fades out over the sign-in webview, so they need
    // not outlive the session the way the Android shell's do.
    tabs = []
    sections = []
    profile = nil
    activeSectionId = ""
    signIn = makeSignIn()
  }
}
