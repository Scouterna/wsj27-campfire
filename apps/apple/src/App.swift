import SwiftUI

/// The key the last theme worn is remembered under, between launches.
private let themeKey = "theme"

/// The shell. It owns the phone's chrome and nothing else: every word a user reads, apart
/// from the failure message and the bar controls' spoken names, comes from the web.
@main
struct CampfireApp: App {
  /// The theme is remembered so the next launch wears the person's unit color from its
  /// first frame, rather than the contingent's blue until the web has loaded and said.
  @State private var model = AppModel(
    origin: Config.webOrigin,
    rememberedTheme: UserDefaults.standard.string(forKey: themeKey),
  ) { name in
    UserDefaults.standard.set(name, forKey: themeKey)
  }

  var body: some Scene {
    WindowGroup {
      ContentView()
        .environment(model)
    }
  }
}
