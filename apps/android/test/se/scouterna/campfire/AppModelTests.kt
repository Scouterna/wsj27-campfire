package se.scouterna.campfire

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNotSame
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertSame
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import se.scouterna.campfire.theme.Palette
import se.scouterna.campfire.web.Profile
import se.scouterna.campfire.web.ToShell

@DisplayName("the app model")
class AppModelTests {
  private val profile = Profile("KK", "/profile")
  private val home = Section("home", "Hem", "/", "home")
  private val people = Section("participants", "Deltagare", "/participants", "participants")

  @Test
  fun `starts at the sign-in webview with no tabs`() {
    val model = AppModel("http://localhost:8000")
    assertNotNull(model.signIn)
    assertTrue(model.tabs.isEmpty())
  }

  @Test
  fun `builds a tab per section once signed in, and drops the sign-in webview`() {
    val model = AppModel("http://localhost:8000")
    model.receive(ToShell.SignedIn(listOf(home, people), profile))
    assertNull(model.signIn)
    assertEquals(listOf("home", "participants"), model.tabs.map { it.id })
    assertEquals("home", model.activeSectionId)
  }

  @Test
  fun `keeps its tabs when the same sections are reported again`() {
    val model = AppModel("http://localhost:8000")
    model.receive(ToShell.SignedIn(listOf(home, people), profile))
    val first = model.tabs
    model.activeSectionId = "participants"
    model.receive(ToShell.SignedIn(listOf(home, people), profile))
    first.zip(model.tabs).forEach { (before, after) -> assertSame(before, after) }
    assertEquals("participants", model.activeSectionId)
  }

  @Test
  fun `returns to the sign-in webview once signed out, keeping the tabs to fade out`() {
    val model = AppModel("http://localhost:8000")
    model.receive(ToShell.SignedIn(listOf(home), profile))
    val signedIn = model.tabs
    model.receive(ToShell.SignedOut)
    assertNotNull(model.signIn)
    assertSame(signedIn, model.tabs)
    assertEquals(profile, model.profile)
  }

  @Test
  fun `builds fresh tabs at the first section when signed in again`() {
    val model = AppModel("http://localhost:8000")
    model.receive(ToShell.SignedIn(listOf(home, people), profile))
    val first = model.tabs
    model.activeSectionId = "participants"
    model.receive(ToShell.SignedOut)
    model.receive(ToShell.SignedIn(listOf(home, people), profile))
    assertNull(model.signIn)
    first.zip(model.tabs).forEach { (before, after) -> assertNotSame(before, after) }
    assertEquals("home", model.activeSectionId)
  }

  @Test
  fun `wears the theme the web names`() {
    val model = AppModel("http://localhost:8000")
    model.receive(ToShell.Theme("red"))
    assertEquals(Palette.theme("red"), model.theme)
  }

  @Test
  fun `wears the remembered theme until the web names one`() {
    val model = AppModel("http://localhost:8000", rememberedTheme = "green")
    assertEquals(Palette.theme("green"), model.theme)
  }

  @Test
  fun `passes on a theme only when it changes`() {
    val named = mutableListOf<String>()
    val model = AppModel("http://localhost:8000", rememberedTheme = "red") { named += it }
    model.receive(ToShell.Theme("red"))
    model.receive(ToShell.Theme("yellow"))
    model.receive(ToShell.Theme("yellow"))
    assertEquals(listOf("yellow"), named)
  }
}
