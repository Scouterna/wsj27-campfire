import Foundation

/// Configuration read from Info.plist, whose values come from an xcconfig.
///
/// The address of the web application is a build setting rather than a literal in the
/// source, so the shell can be pointed at another origin without a code change.
enum Config {
  private static let campfire: [String: String] = {
    guard let dictionary = Bundle.main.infoDictionary?["Campfire"] as? [String: String] else {
      fatalError("The Campfire dictionary is missing from Info.plist")
    }
    return dictionary
  }()

  /// Where the web application is served from.
  static let webOrigin: URL = {
    guard let string = campfire["WebOrigin"], let url = URL(string: string) else {
      fatalError("WebOrigin is missing from the Campfire dictionary in Info.plist")
    }
    return url
  }()
}
