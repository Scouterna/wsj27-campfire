import Foundation
import Testing
@testable import Campfire

@Suite("the bridge")
struct BridgeTests {
  @Test
  func `reads a screen with its actions and its menu groups`() {
    let json = """
    {"v":1,"type":"screen","title":"Deltagare","canGoBack":true,"fullScreen":false,
     "actions":[{"id":"primary","label":"Avdelningar","icon":"participants"}],
     "menu":[[{"id":"menu-0","label":"Mejla","icon":"mail"}],[],
             [{"id":"menu-2","label":"Kopiera","unavailable":"Ingen e-post"}]]}
    """
    let expected = Screen(
      title: "Deltagare",
      canGoBack: true,
      actions: [ScreenItem(
        id: "primary",
        label: "Avdelningar",
        icon: "participants",
        unavailable: nil,
      )],
      // An empty group draws nothing, so it is dropped rather than drawn as a gap.
      menu: [
        [ScreenItem(id: "menu-0", label: "Mejla", icon: "mail", unavailable: nil)],
        [ScreenItem(id: "menu-2", label: "Kopiera", icon: nil, unavailable: "Ingen e-post")],
      ],
    )
    #expect(Bridge.decode(json) == .screen(expected))
  }

  @Test
  func `reads a screen that something fills`() {
    let json = #"{"v":1,"type":"screen","title":"Karta","canGoBack":true,"fullScreen":true}"#
    guard case let .screen(screen) = Bridge.decode(json) else {
      Issue.record("the screen was not read")
      return
    }
    #expect(screen.fullScreen)
  }

  @Test
  func `reads a signed-in session with its sections and profile`() {
    let json = """
    {"v":1,"type":"session","signedIn":true,
     "sections":[{"id":"home","label":"Hem","path":"/","icon":"home"}],
     "profile":{"initials":"KK","path":"/profile"}}
    """
    let section = Section(id: "home", label: "Hem", path: "/", icon: "home")
    #expect(
      Bridge.decode(json)
        == .signedIn(sections: [section], profile: Profile(initials: "KK", path: "/profile")),
    )
  }

  @Test
  func `reads a profile's avatar and decodes a data URL's picture`() {
    let json = """
    {"v":1,"type":"session","signedIn":true,
     "sections":[{"id":"home","label":"Hem","path":"/","icon":"home"}],
     "profile":{"avatar":"data:image/png;base64,AQID","initials":"KK","path":"/profile"}}
    """
    guard case let .signedIn(_, profile) = Bridge.decode(json) else {
      Issue.record("the session was not read")
      return
    }
    #expect(profile.avatar == "data:image/png;base64,AQID")
    #expect(profile.avatarData == Data([1, 2, 3]))
  }

  @Test(arguments: [
    "https://scoutnet.se/user_avatar/1/avatar.png",
    "data:image/svg+xml,%3Csvg%3E",
    "data:image/png;base64,not base64",
  ])
  func `keeps the initials for a picture it does not load`(avatar: String) {
    #expect(Profile(initials: "KK", path: "/profile", avatar: avatar).avatarData == nil)
  }

  @Test
  func `reads signing out and a theme`() {
    #expect(Bridge.decode(#"{"v":1,"type":"session","signedIn":false}"#) == .signedOut)
    #expect(Bridge.decode(#"{"v":1,"type":"theme","name":"brown"}"#) == .theme("brown"))
  }

  @Test(arguments: [
    "{not json",
    #"{"v":2,"type":"theme","name":"blue"}"#,
    #"{"type":"theme","name":"blue"}"#,
    #"{"v":1,"type":"explode"}"#,
    #"{"v":1,"type":"screen","title":"No back"}"#,
    #"{"v":1,"type":"screen","title":"No full screen","canGoBack":false}"#,
    // Signed in with no sections at all.
    #"{"v":1,"type":"session","signedIn":true,"sections":[],"#
      + #""profile":{"initials":"A","path":"/p"}}"#,
    "null",
  ])
  func `drops a message it cannot read`(json: String) {
    #expect(Bridge.decode(json) == nil)
  }

  @Test
  func `writes each message to the web with its version`() throws {
    let cases: [(ToWeb, [String: AnyHashable])] = [
      (.back(animated: false), ["v": 1, "type": "back", "animated": false]),
      (.forward, ["v": 1, "type": "forward"]),
      (.popToRoot, ["v": 1, "type": "popToRoot"]),
      (.action(id: #"a"b"#), ["v": 1, "type": "action", "id": #"a"b"#]),
      (.open(path: "/profile"), ["v": 1, "type": "open", "path": "/profile"]),
    ]
    for (message, expected) in cases {
      let data = try #require(message.json.data(using: .utf8))
      let object = try JSONSerialization.jsonObject(with: data) as? [String: AnyHashable]
      #expect(object == expected)
    }
  }
}
