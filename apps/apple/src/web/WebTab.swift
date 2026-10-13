import Foundation
import SwiftUI
import WebKit

/// One webview, its own back-forward list, and the last screen its page reported.
///
/// The webview is built on first activation and never rebuilt, so leaving a tab and
/// returning shows the screen it was left at without a reload. Its history is its own,
/// which is what keeps a back gesture from reaching another tab.
@MainActor
@Observable
final class WebTab {
  let id: String
  let url: URL

  /// Whether this is the one webview shown while nobody is signed in. It has no bars,
  /// owns the whole screen, and never leaves the application's own page: the round trip
  /// through the identity provider runs in a sheet over it.
  let isSignIn: Bool

  private(set) var screen = Screen.empty
  private(set) var error: String?
  private(set) var webView: WKWebView?

  /// Whether the page has reported anything yet. The page installs the receiver the
  /// shell sends to as it renders, so until this is true a message has nowhere to land,
  /// and the placeholder stays up until the page has drawn rather than merely loaded.
  private(set) var hasReported = false

  /// Whether the page has reported its screen, which it does once it has drawn one. A
  /// tab's placeholder waits for this rather than for the session, which arrives first.
  private(set) var hasScreen = false

  /// Whether the sign-in webview's launch surface covers it, from the start of a load
  /// until the page says nobody is signed in. A page that finds a session is replaced by
  /// the tabs instead, so the application's own render of it, laid out without the bars,
  /// never shows.
  private(set) var isCovered = true

  /// Where the round trip through the identity provider began, shown in a sheet over the
  /// sign-in webview, or nil while none is under way.
  private(set) var roundTrip: URL?

  private let origin: URL
  private let onMessage: (ToShell) -> Void
  private var bridge: Bridge?
  private var navigation: WebNavigation?

  /// The controller hosting the webview, asked where the visual top is when the tab is
  /// reselected. Wiring rather than screen state, written during a SwiftUI update.
  @ObservationIgnored weak var pageController: WebPageController?

  init(
    id: String,
    path: String,
    origin: URL,
    isSignIn: Bool = false,
    onMessage: @escaping (ToShell) -> Void,
  ) {
    self.id = id
    self.origin = origin
    self.isSignIn = isSignIn
    self.onMessage = onMessage
    url = URL(string: path, relativeTo: origin)?.absoluteURL ?? origin
  }

  /// Build the webview and load it, once. Every call after the first does nothing.
  func activate() {
    guard webView == nil else { return }

    let bridge = Bridge { [weak self] message in self?.receive(message) }
    let navigation = WebNavigation(
      origin: origin,
      isSignIn: isSignIn,
      isOwnAddress: { [weak self] address in self?.isOwnAddress(address) ?? false },
      onRoundTrip: { [weak self] address in self?.roundTrip = address },
      onFailure: { [weak self] failure in self?.error = failure },
      onTermination: { [weak self] in self?.contentDidTerminate() },
    )

    let configuration = WKWebViewConfiguration()
    // The token the web reads to learn it is hosted, appended to the default agent so
    // the page still knows which browser it runs in.
    configuration.applicationNameForUserAgent = "CampfireShell/\(Bridge.version) (ios)"
    // One cookie jar for the whole shell. A store of a tab's own would partition the
    // session silently.
    configuration.websiteDataStore = .default()
    configuration.userContentController.add(bridge, name: Bridge.channelName)

    let webView = WKWebView(frame: .zero, configuration: configuration)
    // WebKit's own swipe is off, because its preview comes from a snapshot store that
    // shows a blank page for same-document history. The page controller draws the swipe
    // from a live snapshot instead.
    webView.allowsBackForwardNavigationGestures = false
    // One webview per tab, so a long press offers no preview and no new tab.
    webView.allowsLinkPreview = false
    webView.navigationDelegate = navigation
    webView.uiDelegate = navigation
    #if DEBUG
      webView.isInspectable = true
    #endif

    if isSignIn {
      // Drawn light whatever the window asks, because the window asks for the dark
      // scheme over the hero to get light status-bar content.
      webView.overrideUserInterfaceStyle = .light
      // The application's sign-in screen is one screen drawing its hero under the status
      // bar, so it gets no inset and nothing to scroll. The launch blue shows behind it,
      // so nothing else does before its hero has drawn.
      let scroll = webView.scrollView
      scroll.contentInsetAdjustmentBehavior = .never
      scroll.isScrollEnabled = false
      scroll.bounces = false
      let launch = UIColor(Palette.blue.bright)
      webView.isOpaque = false
      webView.backgroundColor = launch
      webView.underPageBackgroundColor = launch
      scroll.backgroundColor = launch
    } else {
      // Opaque, because a non-opaque webview snapshots as an empty layer and the back
      // swipe would peel away to nothing. The paper paints the overscroll instead.
      let paper = UIColor(Palette.paper)
      webView.underPageBackgroundColor = paper
      webView.scrollView.backgroundColor = paper
    }

    self.bridge = bridge
    self.navigation = navigation
    self.webView = webView

    load()
  }

  /// Load, or reload, the tab's own address.
  func load() {
    error = nil
    webView?.load(URLRequest(url: url))
  }

  /// Go back one layer, slid by the shell as a back swipe is, or animated by the web where
  /// the shell cannot.
  func goBack() {
    if pageController?.slideBack() == true {
      return
    }
    send(.back(animated: true))
  }

  /// The back a swipe asks for as it begins: the gesture is the animation, so the web
  /// pops instantly under the sliding preview.
  func swipeBack() {
    send(.back(animated: false))
  }

  /// A swipe let go without committing, so the screen its back popped comes back.
  func swipeCancel() {
    send(.forward)
  }

  /// A bar item was tapped. What it does is the web's business.
  func perform(_ itemId: String) {
    send(.action(id: itemId))
  }

  /// Show an origin-relative address the web reported.
  func open(_ path: String) {
    send(.open(path: path))
  }

  /// The active tab was selected again – the platform's two-stage gesture. A scrolled
  /// page glides to its top; a page already there returns to the tab's first screen.
  /// Decided here, because the document's own scroll reads zero for the whole stretch
  /// the large title's inset covers, so the web cannot tell those states apart.
  func reselect() {
    if let pageController, !pageController.isAtLogicalTop {
      pageController.scrollToLogicalTop()
      return
    }
    send(.popToRoot)
  }

  /// The round trip came back to the sign-in webview's own address, with the session's
  /// cookies set in the shared jar on the way. The sheet closes, and the sign-in webview
  /// loads the address under its launch surface, so the page drawn for the new session
  /// is the tabs' rather than this one's.
  ///
  /// - Parameter address: the address the round trip returned to
  func roundTripDidReturn(to address: URL) {
    roundTrip = nil
    isCovered = true
    error = nil
    webView?.load(URLRequest(url: address))
  }

  /// The person closed the sheet before the round trip came back, which leaves the
  /// sign-in screen as it was.
  func roundTripDidEnd() {
    roundTrip = nil
  }

  /// Whether an address is the tab's own, whatever its query or fragment.
  func isOwnAddress(_ candidate: URL) -> Bool {
    candidate.scheme == url.scheme && candidate.host() == url.host()
      && candidate.port == url.port && Self.path(of: candidate) == Self.path(of: url)
  }

  private static func path(of address: URL) -> String {
    let path = address.path()
    return path.isEmpty ? "/" : path
  }

  /// The system ends a page's content process for memory whenever it likes, and the tab
  /// reports the loss the way a failed load does. Nothing is sent into the empty page
  /// until a reload has reported again.
  private func contentDidTerminate() {
    hasReported = false
    hasScreen = false
    screen = .empty
    error = String(localized: "shell.gone")
  }

  private func send(_ message: ToWeb) {
    guard hasReported, let webView, let bridge else { return }
    bridge.send(message, to: webView)
  }

  /// Take what the web reported. Internal so a test can report what the bridge would.
  func receive(_ message: ToShell) {
    hasReported = true
    if isSignIn, message == .signedOut {
      isCovered = false
    }
    if case let .screen(screen) = message {
      pageController?.screenDidReport()
      self.screen = screen
      hasScreen = true
      error = nil
      return
    }
    onMessage(message)
  }
}

/// Keeps a webview inside the origin it was pointed at, and turns a failed load into
/// something the shell can show.
@MainActor
private final class WebNavigation: NSObject, WKNavigationDelegate, WKUIDelegate {
  private let origin: URL
  private let isSignIn: Bool
  private let isOwnAddress: (URL) -> Bool
  private let onRoundTrip: (URL) -> Void
  private let onFailure: (String) -> Void
  private let onTermination: () -> Void

  init(
    origin: URL,
    isSignIn: Bool,
    isOwnAddress: @escaping (URL) -> Bool,
    onRoundTrip: @escaping (URL) -> Void,
    onFailure: @escaping (String) -> Void,
    onTermination: @escaping () -> Void,
  ) {
    self.origin = origin
    self.isSignIn = isSignIn
    self.isOwnAddress = isOwnAddress
    self.onRoundTrip = onRoundTrip
    self.onFailure = onFailure
    self.onTermination = onTermination
  }

  nonisolated func webView(
    _: WKWebView,
    decidePolicyFor navigationAction: WKNavigationAction,
    decisionHandler: @escaping @MainActor (WKNavigationActionPolicy) -> Void,
  ) {
    MainActor.assumeIsolated {
      guard let url = navigationAction.request.url else {
        decisionHandler(.cancel)
        return
      }
      let isWeb = url.scheme == "http" || url.scheme == "https"
      let isOrigin = url.host() == origin.host() && url.port == origin.port
        && url.scheme == origin.scheme
      let isMainFrame = navigationAction.targetFrame?.isMainFrame ?? true
      // The sign-in webview stays on its own page, and the round trip through the
      // identity provider that starts from it opens in a sheet instead.
      if isSignIn, isWeb, isMainFrame, !isOwnAddress(url) {
        decisionHandler(.cancel)
        onRoundTrip(url)
        return
      }
      // A tab follows a redirect wherever it leads, because signing out passes through
      // the identity provider on its way back. WebKit tells a redirect only as a
      // navigation nobody tapped, which a script's own is too.
      let isRedirect = navigationAction.navigationType == .other && navigationAction
        .targetFrame != nil
      if isOrigin || (isWeb && isRedirect) {
        decisionHandler(.allow)
        return
      }
      // Anything else off the origin – a mailto:, a tel:, another site – goes to the
      // system, because a tab holds one application.
      decisionHandler(.cancel)
      UIApplication.shared.open(url)
    }
  }

  nonisolated func webView(
    _: WKWebView,
    // WebKit declares this implicitly unwrapped; an ordinary optional still conforms.
    didFailProvisionalNavigation _: WKNavigation?,
    withError error: any Error,
  ) {
    MainActor.assumeIsolated {
      // A navigation the policy above canceled fails too, and is no failure to show.
      if (error as NSError).code == NSURLErrorCancelled {
        return
      }
      if (error as NSError).domain == "WebKitErrorDomain", (error as NSError).code == 102 {
        return
      }
      onFailure(error.localizedDescription)
    }
  }

  nonisolated func webViewWebContentProcessDidTerminate(_: WKWebView) {
    MainActor.assumeIsolated {
      onTermination()
    }
  }

  /// Refused, so a `target="_blank"` link cannot spawn a webview outside the tab bar.
  /// Returning nil abandons the navigation, so the request is loaded here by hand, where
  /// the policy above decides whether it stays or goes to the system.
  nonisolated func webView(
    _ webView: WKWebView,
    createWebViewWith _: WKWebViewConfiguration,
    for navigationAction: WKNavigationAction,
    windowFeatures _: WKWindowFeatures,
  ) -> WKWebView? {
    MainActor.assumeIsolated {
      webView.load(navigationAction.request)
      return nil
    }
  }
}
