import SwiftUI

/// The web's palette, so the native chrome and the pages read as one surface.
///
/// The values are the web's color tokens in `libraries/ui/assets/styles/tokens.css`, and
/// the Android shell carries the same names. A theme crosses the bridge as a name and is
/// mapped here, because a color never crosses it.
enum Palette {
  /// The pages' background, carried by the chrome around the webview so the regions
  /// under the bars continue the page rather than showing the system background.
  static let paper = Color(hex: 0xF4F2EC)
  /// A skeleton's bones: the paper, one shade down.
  static let bone = Color(hex: 0xE6E4DE)

  /// One unit's color identity: the bright ring of its badge, and the ink of its disc
  /// that the controls, the tab tint, and the large title wear.
  struct Theme: Equatable {
    let bright: Color
    let ink: Color
  }

  static let blue = Theme(bright: Color(hex: 0x2A778A), ink: Color(hex: 0x215262))

  private static let themes: [String: Theme] = [
    "blue": blue,
    "brown": Theme(bright: Color(hex: 0x985B15), ink: Color(hex: 0x643D14)),
    "green": Theme(bright: Color(hex: 0x768B33), ink: Color(hex: 0x526125)),
    "red": Theme(bright: Color(hex: 0xCD4B17), ink: Color(hex: 0x9B3716)),
    "yellow": Theme(bright: Color(hex: 0xF4C125), ink: Color(hex: 0xC3900B)),
  ]

  /// The theme a name reported by the web stands for. An unknown name is blue, the
  /// contingent's own, because the web may lead the shell by a release.
  static func theme(named name: String) -> Theme {
    themes[name] ?? blue
  }
}

private extension Color {
  init(hex: UInt32) {
    self.init(
      red: Double(hex >> 16 & 0xFF) / 255,
      green: Double(hex >> 8 & 0xFF) / 255,
      blue: Double(hex & 0xFF) / 255,
    )
  }
}
