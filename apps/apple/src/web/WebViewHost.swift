import SwiftUI
import WebKit

/// A `WKWebView` the shell owns, placed in a SwiftUI tree. The view is handed in rather
/// than made here, because its lifetime is the tab's rather than the view's.
struct WebViewHost: UIViewRepresentable {
  let webView: WKWebView

  func makeUIView(context _: Context) -> WKWebView {
    webView
  }

  func updateUIView(_: WKWebView, context _: Context) {}
}
