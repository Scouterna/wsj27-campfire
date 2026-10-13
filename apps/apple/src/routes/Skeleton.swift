import SwiftUI

/// What covers a webview until its page has drawn, or when its address cannot be
/// reached: the sign-in webview's launch surface, or a tab's skeleton, or the failure.
struct TabOverlay: View {
  let tab: WebTab
  /// The sign-in webview's launch surface, the launch image's blue until a theme is
  /// known.
  var launch = Palette.blue.bright

  var body: some View {
    if let failure = tab.error {
      ContentUnavailableView {
        Label("shell.unreachable.title", systemImage: "wifi.exclamationmark")
      } description: {
        Text(verbatim: "\(tab.url.absoluteString)\n\n\(failure)")
      } actions: {
        Button("shell.unreachable.retry") { tab.load() }
      }
      .background(Palette.paper.ignoresSafeArea())
    } else if tab.isSignIn {
      // The hero's color, so the system's launch image, this, and the page's hero read
      // as one surface rather than a screen to sit through.
      launch.ignoresSafeArea()
    } else {
      ListSkeleton()
    }
  }
}

/// A shimmering list in the pages' own layout, so a slow network shows the app's shapes
/// rather than a blank surface.
private struct ListSkeleton: View {
  @State private var isBreathing = false

  var body: some View {
    VStack(spacing: 16) {
      VStack(alignment: .leading, spacing: 20) {
        Bone(width: 140, height: 16)
        ForEach(0 ..< 5, id: \.self) { _ in
          HStack(spacing: 16) {
            RoundedRectangle(cornerRadius: 12).fill(Palette.bone).frame(width: 44, height: 44)
            VStack(alignment: .leading, spacing: 7) {
              Bone(width: 190, height: 14)
              Bone(width: 130, height: 11)
            }
            Spacer()
          }
        }
      }
      .padding(20)
      .background(.white, in: RoundedRectangle(cornerRadius: 18))

      Spacer()
    }
    .padding(16)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    // The paper runs under the bars; the bones stay inside the safe area, which the
    // hosting page controller gives the navigation bar's height.
    .background(Palette.paper.ignoresSafeArea())
    .opacity(isBreathing ? 0.65 : 1)
    .onAppear {
      withAnimation(.easeInOut(duration: 0.9).repeatForever(autoreverses: true)) {
        isBreathing = true
      }
    }
  }
}

private struct Bone: View {
  let width: CGFloat
  let height: CGFloat

  var body: some View {
    RoundedRectangle(cornerRadius: height / 2)
      .fill(Palette.bone)
      .frame(width: width, height: height)
  }
}
