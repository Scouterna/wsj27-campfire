import Foundation

/// One section the signed-in person may open, drawn as a tab.
///
/// Which sections exist is the web's to say, from the person's roles, and the shell draws
/// what it is told. Only the icon is the shell's own, because the bridge carries a
/// semantic name and never a glyph.
struct Section: Identifiable, Hashable, Sendable {
  let id: String
  let label: String
  let path: String
  let symbol: String

  init(id: String, label: String, path: String, icon: String) {
    self.id = id
    self.label = label
    self.path = path
    symbol = Self.symbol(for: icon)
  }

  /// The bridge's icon vocabulary, as the web application names it. A name the web
  /// sends and this map lacks draws the neutral shape, because the web may lead the
  /// shell by a release.
  private static let symbols: [String: String] = [
    "back": "chevron.backward",
    "chat": "bubble.left",
    "check": "checkmark",
    "copy": "doc.on.doc",
    "home": "house",
    "idcard": "person.text.rectangle",
    "mail": "envelope",
    "more": "ellipsis",
    "participants": "person.2",
    "phone": "phone",
    "search": "magnifyingglass",
  ]

  /// The SF Symbol for a semantic icon name.
  static func symbol(for icon: String) -> String {
    symbols[icon] ?? "circle"
  }
}
