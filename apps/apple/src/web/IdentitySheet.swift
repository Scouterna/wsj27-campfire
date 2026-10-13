import SwiftUI
import WebKit

/// The round trip through the identity provider, in a sheet over the sign-in screen. It
/// has a webview of its own on the shell's cookie store, so the session the auth service
/// sets on the way back lands where the tabs read it, and it closes once the round trip
/// is back at the sign-in webview's own address.
struct IdentitySheet: View {
  /// Where the round trip begins.
  let address: URL
  /// Whether an address is the one the round trip comes back to.
  let isReturn: (URL) -> Bool
  /// Called with the address the round trip came back to.
  let onReturn: (URL) -> Void
  /// Called when the person closes the sheet before the round trip has come back.
  let onClose: () -> Void

  /// Made once the sheet appears rather than when the view is, because SwiftUI makes a
  /// view many times, and every round trip started is one more login request, whose state
  /// replaces the one the page showing carries.
  @State private var flow: IdentityFlow?

  var body: some View {
    NavigationStack {
      ZStack {
        if let flow {
          WebViewHost(webView: flow.webView)
        }
        if let failure = flow?.error {
          ContentUnavailableView {
            Label("shell.identity.unreachable", systemImage: "wifi.exclamationmark")
          } description: {
            Text(verbatim: failure)
          } actions: {
            Button("shell.unreachable.retry") { flow?.load() }
          }
          .background(.background)
        }
      }
      // Where the person is signing in, as a browser's address bar would say, because the
      // page asking for a password is not the app's own.
      .navigationTitle(Text(verbatim: flow?.host ?? address.host() ?? ""))
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button(role: .close, action: onClose)
        }
      }
    }
    .onAppear {
      if flow == nil {
        flow = IdentityFlow(address: address, isReturn: isReturn)
      }
    }
    .onChange(of: flow?.returned) { _, returned in
      if let returned {
        onReturn(returned)
      }
    }
  }
}

/// The webview a round trip runs in, and where it has got to.
@MainActor
@Observable
final class IdentityFlow {
  let webView: WKWebView
  /// The host of the page showing.
  private(set) var host: String
  /// Why the page showing could not be loaded, or nil while it could.
  private(set) var error: String?
  /// The address the round trip came back to, once it has.
  private(set) var returned: URL?

  private let address: URL
  private var navigation: IdentityNavigation?

  /// - Parameters:
  ///   - address: where the round trip begins
  ///   - isReturn: whether an address is the one the round trip comes back to
  init(address: URL, isReturn: @escaping (URL) -> Bool) {
    self.address = address
    host = address.host() ?? ""

    let configuration = WKWebViewConfiguration()
    // The shell's one cookie jar, so the session set on the way back reaches the tabs.
    // The agent carries no shell token, because the identity provider is an ordinary
    // site rather than the hosted application.
    configuration.websiteDataStore = .default()
    webView = WKWebView(frame: .zero, configuration: configuration)
    webView.allowsLinkPreview = false
    #if DEBUG
      webView.isInspectable = true
    #endif

    let navigation = IdentityNavigation(
      isReturn: isReturn,
      onReturn: { [weak self] address in self?.returned = address },
      onCommit: { [weak self] in
        guard let self, let host = webView.url?.host() else { return }
        self.host = host
        error = nil
      },
      onFailure: { [weak self] failure in self?.error = failure },
    )
    webView.navigationDelegate = navigation
    webView.uiDelegate = navigation
    self.navigation = navigation

    load()
  }

  /// Load, or reload, where the round trip began.
  func load() {
    error = nil
    webView.load(URLRequest(url: address))
  }
}

/// Follows the round trip wherever it leads on the web, and stops it at its return.
@MainActor
private final class IdentityNavigation: NSObject, WKNavigationDelegate, WKUIDelegate {
  private let isReturn: (URL) -> Bool
  private let onReturn: (URL) -> Void
  private let onCommit: () -> Void
  private let onFailure: (String) -> Void

  init(
    isReturn: @escaping (URL) -> Bool,
    onReturn: @escaping (URL) -> Void,
    onCommit: @escaping () -> Void,
    onFailure: @escaping (String) -> Void,
  ) {
    self.isReturn = isReturn
    self.onReturn = onReturn
    self.onCommit = onCommit
    self.onFailure = onFailure
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
      let isMainFrame = navigationAction.targetFrame?.isMainFrame ?? true
      // The return is loaded by the sign-in webview rather than here, so the page drawn
      // for the new session is drawn where the shell can hand it on.
      if isWeb, isMainFrame, isReturn(url) {
        decisionHandler(.cancel)
        onReturn(url)
        return
      }
      if isWeb {
        decisionHandler(.allow)
        return
      }
      decisionHandler(.cancel)
      UIApplication.shared.open(url)
    }
  }

  nonisolated func webView(_: WKWebView, didCommit _: WKNavigation?) {
    MainActor.assumeIsolated {
      onCommit()
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

  /// Refused, so a `target="_blank"` link cannot spawn a second webview. Returning nil
  /// abandons the navigation, so the request is loaded here by hand, where the policy
  /// above decides whether it stays.
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
