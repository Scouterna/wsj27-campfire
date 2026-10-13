import SwiftUI

/// The gate: one full-screen webview while nobody is signed in, the tabs after. The side
/// leaving fades out over the side arriving, so signing in or out reads as one surface
/// giving way to the other.
struct ContentView: View {
  @Environment(AppModel.self) private var model

  /// Whether the tabs are fading out after a sign-out, until their picture has faded
  /// halfway. The status bar's content stays dark until then, rather than turning light
  /// over a picture still mostly pale. Only the status bar would follow it the other way:
  /// a dark scheme held over the arriving tabs would dress their bars dark as well.
  @State private var isSigningOut = false

  var body: some View {
    ZStack {
      Palette.paper.ignoresSafeArea()
      if model.signIn == nil {
        MainView()
      }
      if let signIn = model.signIn {
        // The remembered theme from the first frame, cutting from the system's launch image,
        // which is the contingent's blue whatever theme is remembered. A fade between two
        // such different hues passes through grey.
        SignInView(tab: signIn, surface: model.theme.bright)
          .ignoresSafeArea()
          .zIndex(1)
      }
    }
    // The two sides swap at once under a picture of the side leaving, which fades out
    // whole. A transition would fade each side on its own, and SwiftUI
    // takes away the UIKit views inside them without one, so the tabs would cut to paper.
    .onChange(of: model.signIn == nil) { wasSignedIn, _ in
      fadeOutScreen()
      guard wasSignedIn else { return }
      isSigningOut = true
      Task {
        try? await Task.sleep(for: .seconds(fadeDuration / 2))
        isSigningOut = false
      }
    }
    // The web draws no dark theme, so neither does the chrome around it. The hero is the
    // exception only for the status bar, whose content the dark scheme turns light.
    .preferredColorScheme(model.signIn != nil && !isSigningOut ? .dark : .light)
  }
}

/// How long the side leaving takes to fade out.
private let fadeDuration = 0.3

/// Puts a picture of the screen as it was last drawn over whatever is replacing it, and
/// fades it out.
@MainActor
private func fadeOutScreen() {
  let window = UIApplication.shared.connectedScenes
    .compactMap { $0 as? UIWindowScene }
    .flatMap(\.windows)
    .first(where: \.isKeyWindow)
  guard let window, let picture = window.snapshotView(afterScreenUpdates: false) else { return }
  picture.isUserInteractionEnabled = false
  window.addSubview(picture)
  UIView.animate(withDuration: fadeDuration, delay: 0, options: .curveEaseInOut) {
    picture.alpha = 0
  } completion: { _ in
    picture.removeFromSuperview()
  }
}

/// The sign-in webview, with no bars – it is one screen with nowhere to go back to – and
/// full bleed, so the page's hero reaches the top of the screen. It stays behind the launch
/// surface until its page says nobody is signed in, and the round trip through the
/// identity provider that it starts runs in a sheet over it.
private struct SignInView: View {
  let tab: WebTab
  /// The launch surface's color: the theme the person last wore, which the page's hero
  /// wears too, so signing out lands on one color rather than passing through blue.
  let surface: Color

  /// Whether the sheet shows, closed by the person by swiping it away as well.
  private var isRoundTripShown: Binding<Bool> {
    Binding {
      tab.roundTrip != nil
    } set: { isShown in
      if !isShown, tab.roundTrip != nil {
        tab.roundTripDidEnd()
      }
    }
  }

  var body: some View {
    ZStack {
      // The webview draws under the cover rather than invisibly, because WebKit does not
      // paint a page nobody can see, and uncovering would fade in its empty background.
      if let webView = tab.webView {
        WebViewHost(webView: webView)
      }
      // Always there and faded rather than inserted and removed, so uncovering is one
      // blend from the cover into the drawn page.
      TabOverlay(tab: tab, launch: surface)
        .opacity(tab.error != nil || tab.isCovered ? 1 : 0)
        .allowsHitTesting(tab.error != nil || tab.isCovered)
        .animation(.easeOut(duration: 0.3), value: tab.isCovered)
    }
    // The failure message stays light under the hero's dark status-bar scheme.
    .environment(\.colorScheme, .light)
    .sheet(isPresented: isRoundTripShown) {
      if let roundTrip = tab.roundTrip {
        IdentitySheet(
          address: roundTrip,
          isReturn: tab.isOwnAddress,
          onReturn: tab.roundTripDidReturn(to:),
          onClose: tab.roundTripDidEnd,
        )
        // Light, whatever the window asks for over the hero, because the sheet is a
        // presentation of its own and takes its scheme from its own content.
        .preferredColorScheme(.light)
      }
    }
    .task { tab.activate() }
  }
}
