package se.scouterna.campfire.web

import org.json.JSONObject
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource
import se.scouterna.campfire.Section

@DisplayName("the bridge")
class BridgeTests {
  @Test
  fun `reads a screen with its actions and its menu groups`() {
    val json =
      """
      {"v":1,"type":"screen","title":"Deltagare","canGoBack":true,"fullScreen":false,
       "actions":[{"id":"primary","label":"Avdelningar","icon":"participants"}],
       "menu":[[{"id":"menu-0","label":"Mejla","icon":"mail"}],[],
               [{"id":"menu-2","label":"Kopiera","unavailable":"Ingen e-post"}]]}
      """
    val expected =
      Screen(
        title = "Deltagare",
        canGoBack = true,
        actions = listOf(ScreenItem("primary", "Avdelningar", icon = "participants")),
        // An empty group draws nothing, so it is dropped rather than drawn as a gap.
        menu =
          listOf(
            listOf(ScreenItem("menu-0", "Mejla", icon = "mail")),
            listOf(ScreenItem("menu-2", "Kopiera", unavailable = "Ingen e-post")),
          ),
      )
    assertEquals(ToShell.ScreenReport(expected), Bridge.decode(json))
  }

  @Test
  fun `reads a screen that something fills`() {
    val json = """{"v":1,"type":"screen","title":"Karta","canGoBack":true,"fullScreen":true}"""
    assertEquals(true, (Bridge.decode(json) as ToShell.ScreenReport).screen.fullScreen)
  }

  @Test
  fun `reads a signed-in session with its sections and profile`() {
    val json =
      """
      {"v":1,"type":"session","signedIn":true,
       "sections":[{"id":"home","label":"Hem","path":"/","icon":"home"}],
       "profile":{"initials":"KK","path":"/profile"}}
      """
    assertEquals(
      ToShell.SignedIn(listOf(Section("home", "Hem", "/", "home")), Profile("KK", "/profile")),
      Bridge.decode(json),
    )
  }

  @Test
  fun `reads a profile's avatar and decodes a data URL's picture`() {
    val json =
      """
      {"v":1,"type":"session","signedIn":true,
       "sections":[{"id":"home","label":"Hem","path":"/","icon":"home"}],
       "profile":{"avatar":"data:image/png;base64,AQID","initials":"KK","path":"/profile"}}
      """
    val profile = (Bridge.decode(json) as ToShell.SignedIn).profile
    assertEquals("data:image/png;base64,AQID", profile.avatar)
    assertEquals(listOf<Byte>(1, 2, 3), profile.avatarBytes?.toList())
  }

  @ParameterizedTest
  @ValueSource(
    strings = [
      "https://scoutnet.se/user_avatar/1/avatar.png",
      "data:image/svg+xml,%3Csvg%3E",
      "data:image/png;base64,not base64",
    ],
  )
  fun `keeps the initials for a picture it does not load`(avatar: String) {
    assertNull(Profile("KK", "/profile", avatar).avatarBytes)
  }

  @Test
  fun `reads signing out and a theme`() {
    assertEquals(ToShell.SignedOut, Bridge.decode("""{"v":1,"type":"session","signedIn":false}"""))
    assertEquals(ToShell.Theme("brown"), Bridge.decode("""{"v":1,"type":"theme","name":"brown"}"""))
  }

  @ParameterizedTest
  @ValueSource(
    strings = [
      "{not json",
      """{"v":2,"type":"theme","name":"blue"}""",
      """{"type":"theme","name":"blue"}""",
      """{"v":1,"type":"explode"}""",
      """{"v":1,"type":"screen","title":"No back"}""",
      """{"v":1,"type":"screen","title":"No full screen","canGoBack":false}""",
      // Signed in with no sections at all.
      """{"v":1,"type":"session","signedIn":true,"sections":[],""" +
        """"profile":{"initials":"A","path":"/p"}}""",
    ],
  )
  fun `drops a message it cannot read`(json: String) {
    assertNull(Bridge.decode(json))
  }

  @Test
  fun `writes each message to the web with its version`() {
    val cases =
      mapOf(
        ToWeb.Back to """{"v":1,"type":"back","animated":true}""",
        ToWeb.PopToRoot to """{"v":1,"type":"popToRoot"}""",
        ToWeb.Action("a\"b") to """{"v":1,"type":"action","id":"a\"b"}""",
        ToWeb.Open("/profile") to """{"v":1,"type":"open","path":"/profile"}""",
      )
    for ((message, expected) in cases) {
      assertEquals(fields(expected), fields(message.json))
    }
  }

  /** A message's fields as text, so key order never decides a comparison. */
  private fun fields(json: String): Map<String, String> {
    val message = JSONObject(json)
    return message.keys().asSequence().associateWith { message.get(it).toString() }
  }
}
