import Foundation
import WebKit

/// One item a screen offers in the bar – the primary action or an overflow entry. The
/// label is drawn natively, and the id goes back over the bridge when it is tapped.
struct ScreenItem: Hashable, Identifiable, Sendable {
  let id: String
  let label: String
  /// A semantic icon name, mapped by `Section.symbol(for:)`.
  let icon: String?
  /// Why the item cannot be chosen right now, drawn as a disabled item's subtitle.
  let unavailable: String?
}

/// The screen a tab's webview is showing, as the web last reported it.
struct Screen: Equatable, Sendable {
  let title: String
  let canGoBack: Bool
  let actions: [ScreenItem]
  /// Groups of overflow entries, drawn with a separator between them.
  let menu: [[ScreenItem]]
  /// Whether something on the page fills the screen, so the bars step aside for it.
  var fullScreen = false

  /// What a tab shows before its page has reported anything.
  static let empty = Screen(title: "", canGoBack: false, actions: [], menu: [])
}

/// Who is signed in, as far as the bar needs: the avatar's initials, and the address it
/// opens – on which it is not drawn.
struct Profile: Equatable, Sendable {
  let initials: String
  let path: String
  /// The picture drawn in place of the initials, as the image URL the web sent, or nil
  /// where the initials stand.
  var avatar: String?

  /// The picture's bytes, from a `data:` URL carrying base64. Any other scheme is one the
  /// shell does not load, so the initials stand.
  var avatarData: Data? {
    guard
      let avatar,
      avatar.hasPrefix("data:"),
      let comma = avatar.firstIndex(of: ","),
      avatar[..<comma].hasSuffix(";base64")
    else {
      return nil
    }
    return Data(base64Encoded: String(avatar[avatar.index(after: comma)...]))
  }
}

/// A message from the web application.
enum ToShell: Equatable, Sendable {
  case screen(Screen)
  case signedIn(sections: [Section], profile: Profile)
  case signedOut
  case theme(String)
}

/// A message to the web application.
enum ToWeb: Equatable, Sendable {
  /// Go back one layer, unanimated when the shell's own swipe already animated it.
  case back(animated: Bool)
  /// Restore the layer a canceled swipe's back just popped.
  case forward
  case popToRoot
  case action(id: String)
  /// Show an origin-relative address, as a tapped link would.
  case open(path: String)

  var json: String {
    let object: [String: Any] = switch self {
      case let .back(animated): ["v": Bridge.version, "type": "back", "animated": animated]
      case .forward: ["v": Bridge.version, "type": "forward"]
      case .popToRoot: ["v": Bridge.version, "type": "popToRoot"]
      case let .action(id): ["v": Bridge.version, "type": "action", "id": id]
      case let .open(path): ["v": Bridge.version, "type": "open", "path": path]
    }
    // Every value is a string, a number, or a Boolean, so serializing cannot fail.
    let data = (try? JSONSerialization.data(withJSONObject: object, options: [.sortedKeys]))
    return data.flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
  }
}

/// The transport, and nothing else.
///
/// `WKWebView` has no reverse channel, so the two directions are not symmetrical: the web
/// posts to a script message handler, and the shell calls into the page through the
/// receiver the web half installed on `window`.
@MainActor
final class Bridge: NSObject, WKScriptMessageHandler {
  /// The script message handler's name, and the object the web application posts to.
  nonisolated static let channelName = "campfire"

  /// The protocol version this shell speaks. A message carrying any other is dropped.
  nonisolated static let version = 1

  private let onMessage: (ToShell) -> Void

  init(onMessage: @escaping (ToShell) -> Void) {
    self.onMessage = onMessage
  }

  /// Ask the web application to act. Sent only after the page has reported something,
  /// so its receiver is installed by the time this runs.
  func send(_ message: ToWeb, to webView: WKWebView) {
    // The JSON goes in as a string literal, encoded as JSON itself, so nothing in an id
    // or a path can end the literal early.
    guard
      let literal = try? JSONSerialization.data(
        withJSONObject: message.json,
        options: [.fragmentsAllowed],
      ),
      let quoted = String(data: literal, encoding: .utf8)
    else {
      return
    }
    webView.evaluateJavaScript("window.__campfire?.receive(\(quoted))")
  }

  nonisolated func userContentController(
    _: WKUserContentController,
    didReceive message: WKScriptMessage,
  ) {
    MainActor.assumeIsolated {
      guard let json = message.body as? String, let decoded = Self.decode(json) else { return }
      onMessage(decoded)
    }
  }

  /// A message that does not parse, carries another version, or names a type this shell
  /// does not know is dropped rather than guessed at.
  nonisolated static func decode(_ json: String) -> ToShell? {
    guard
      let data = json.data(using: .utf8),
      let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
      object["v"] as? Int == version,
      let type = object["type"] as? String
    else {
      return nil
    }

    switch type {
      case "screen": return decodeScreen(object)
      case "session": return decodeSession(object)
      case "theme": return (object["name"] as? String).map { .theme($0) }
      default: return nil
    }
  }
}

// The decoders behind `Bridge.decode`, outside the main actor because a message is read
// before it is handed there.

private func decodeScreen(_ object: [String: Any]) -> ToShell? {
  guard
    let title = object["title"] as? String,
    let canGoBack = object["canGoBack"] as? Bool,
    let fullScreen = object["fullScreen"] as? Bool
  else {
    return nil
  }
  let actions = (object["actions"] as? [[String: Any]] ?? []).compactMap(decodeItem)
  let menu = (object["menu"] as? [[[String: Any]]] ?? [])
    .map { group in group.compactMap(decodeItem) }
    .filter { !$0.isEmpty }
  return .screen(Screen(
    title: title,
    canGoBack: canGoBack,
    actions: actions,
    menu: menu,
    fullScreen: fullScreen,
  ))
}

private func decodeItem(_ item: [String: Any]) -> ScreenItem? {
  guard let id = item["id"] as? String, let label = item["label"] as? String else {
    return nil
  }
  return ScreenItem(
    id: id,
    label: label,
    icon: item["icon"] as? String,
    unavailable: item["unavailable"] as? String,
  )
}

private func decodeSession(_ object: [String: Any]) -> ToShell? {
  guard let signedIn = object["signedIn"] as? Bool else { return nil }
  guard signedIn else { return .signedOut }

  guard
    let entries = object["sections"] as? [[String: Any]],
    let profile = object["profile"] as? [String: Any],
    let initials = profile["initials"] as? String,
    let path = profile["path"] as? String
  else {
    return nil
  }
  let sections = entries.compactMap { entry -> Section? in
    guard
      let id = entry["id"] as? String,
      let label = entry["label"] as? String,
      let path = entry["path"] as? String,
      let icon = entry["icon"] as? String
    else {
      return nil
    }
    return Section(id: id, label: label, path: path, icon: icon)
  }
  // Signed in with nowhere to go is not a state the shell can draw.
  guard !sections.isEmpty else { return nil }
  return .signedIn(
    sections: sections,
    profile: Profile(initials: initials, path: path, avatar: profile["avatar"] as? String),
  )
}
