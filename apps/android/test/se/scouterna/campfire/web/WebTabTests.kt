package se.scouterna.campfire.web

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

@DisplayName("a web tab")
class WebTabTests {
  private val screen =
    Screen(title = "Deltagare", canGoBack = false, actions = emptyList(), menu = emptyList())

  @Test
  fun `keeps a screen report for its bar, and passes nothing on`() {
    val passed = mutableListOf<ToShell>()
    val tab = WebTab("participants", "/participants", "http://localhost:8000") { passed += it }
    tab.receive(ToShell.ScreenReport(screen))
    assertEquals(screen, tab.screen)
    assertTrue(tab.hasScreen)
    assertTrue(passed.isEmpty())
  }

  @Test
  fun `knows no path for a screen before it has a webview to read one from`() {
    val tab = WebTab("participants", "/participants", "http://localhost:8000") {}
    tab.receive(ToShell.ScreenReport(screen))
    assertNull(tab.screenPath)
  }

  @Test
  fun `passes a session on without counting it as a screen`() {
    val passed = mutableListOf<ToShell>()
    val tab = WebTab("sign-in", "/", "http://localhost:8000", isSignIn = true) { passed += it }
    tab.receive(ToShell.SignedOut)
    assertEquals(listOf<ToShell>(ToShell.SignedOut), passed)
    assertTrue(tab.hasReported)
    assertFalse(tab.hasScreen)
  }

  @Test
  fun `shows its sign-in screen only once its page has said nobody is signed in`() {
    val tab = WebTab("sign-in", "/", "http://localhost:8000", isSignIn = true) {}
    assertFalse(tab.showsSignIn)
    tab.receive(ToShell.Theme("red"))
    assertFalse(tab.showsSignIn)
    tab.receive(ToShell.SignedOut)
    assertTrue(tab.showsSignIn)
    tab.receive(ToShell.SignedIn(emptyList(), Profile("KK", "/profile")))
    assertFalse(tab.showsSignIn)
  }

  @Test
  fun `knows its own address whatever the query, and nothing else`() {
    val tab = WebTab("sign-in", "/", "http://localhost:8000/", isSignIn = true) {}
    assertTrue(tab.isOwnAddress("http://localhost:8000/"))
    assertTrue(tab.isOwnAddress("http://localhost:8000/?code=1#top"))
    assertTrue(tab.isOwnAddress("http://localhost:8000"))
    assertFalse(tab.isOwnAddress("http://localhost:8000/__mock__/scoutid/auth"))
    assertFalse(tab.isOwnAddress("https://login.scouterna.se/"))
    assertFalse(tab.isOwnAddress("not an address"))
  }

  @Test
  fun `is not leaving on the first page it loads`() {
    val tab = WebTab("participants", "/participants", "http://localhost:8000") {}
    tab.started("http://localhost:8000/participants")
    assertFalse(tab.isLeaving)
  }

  @Test
  fun `is leaving once its page loads another document after speaking`() {
    val tab = WebTab("participants", "/participants", "http://localhost:8000") {}
    tab.receive(ToShell.ScreenReport(screen))
    tab.started("http://localhost:8000/api/auth/logout")
    assertTrue(tab.isLeaving)
    tab.receive(ToShell.SignedOut)
    assertTrue(tab.isLeaving)
  }

  @Test
  fun `stops leaving once the new document draws a signed-in screen`() {
    val tab = WebTab("participants", "/participants", "http://localhost:8000") {}
    tab.receive(ToShell.ScreenReport(screen))
    tab.started("http://localhost:8000/participants")
    tab.receive(ToShell.SignedIn(emptyList(), Profile("KK", "/profile")))
    assertFalse(tab.isLeaving)
  }

  @Test
  fun `never covers the sign-in webview as leaving`() {
    val tab = WebTab("sign-in", "/", "http://localhost:8000", isSignIn = true) {}
    tab.receive(ToShell.SignedOut)
    tab.started("http://localhost:8000/")
    assertFalse(tab.isLeaving)
  }

  @Test
  fun `covers the sign-in webview again when it loads after the round trip`() {
    val tab = WebTab("sign-in", "/", "http://localhost:8000", isSignIn = true) {}
    tab.receive(ToShell.SignedOut)
    assertFalse(tab.awaitsSession)
    tab.roundTripDidReturn("http://localhost:8000/")
    tab.started("http://localhost:8000/")
    assertTrue(tab.awaitsSession)
    assertNull(tab.roundTrip)
  }

  @Test
  fun `leaves the sign-in screen showing when the round trip is closed`() {
    val tab = WebTab("sign-in", "/", "http://localhost:8000", isSignIn = true) {}
    tab.receive(ToShell.SignedOut)
    tab.roundTripDidEnd()
    assertFalse(tab.awaitsSession)
    assertNull(tab.roundTrip)
  }
}
