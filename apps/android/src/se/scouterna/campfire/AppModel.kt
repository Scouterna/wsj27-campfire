package se.scouterna.campfire

import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import se.scouterna.campfire.theme.Palette
import se.scouterna.campfire.web.Profile
import se.scouterna.campfire.web.ToShell
import se.scouterna.campfire.web.WebTab

/**
 * Everything the shell holds while it runs: the sign-in webview or the tabs, which tab is
 * showing, who is signed in, and the theme they wear.
 *
 * The session itself lives in the shared cookie jar, never here, so a relaunch asks the
 * web again and lands wherever the web's own gate does.
 */
@Stable
internal class AppModel(
  private val origin: String,
  /** The name of the theme the last session wore, worn from the first frame of this one. */
  rememberedTheme: String? = null,
  /** Called with the name of each theme the web names that differs from the one worn. */
  private val onTheme: (String) -> Unit = {},
) {
  /**
   * The one full-screen webview shown while nobody is signed in. Dropped once someone is,
   * so no tab's history can reach the sign-in screen.
   */
  var signIn by mutableStateOf<WebTab?>(makeSignIn())
    private set

  var sections by mutableStateOf<List<Section>>(emptyList())
    private set

  var tabs by mutableStateOf<List<WebTab>>(emptyList())
    private set

  var profile by mutableStateOf<Profile?>(null)
    private set

  var theme by mutableStateOf(rememberedTheme?.let(Palette::theme) ?: Palette.blue)
    private set

  var activeSectionId by mutableStateOf("")

  /** The tab the tab bar is showing. */
  val activeTab: WebTab?
    get() = tabs.firstOrNull { it.id == activeSectionId }

  /**
   * Take a session or theme report from any webview. Internal so a test can report what a
   * page would.
   */
  internal fun receive(message: ToShell) {
    when (message) {
      is ToShell.SignedIn -> signedIn(message.sections, message.profile)

      ToShell.SignedOut -> signedOut()

      is ToShell.Theme -> wear(message.name)

      // A screen belongs to the tab that reported it, which keeps it.
      is ToShell.ScreenReport -> Unit
    }
  }

  private fun wear(name: String) {
    val named = Palette.theme(name)
    if (named == theme) return
    theme = named
    onTheme(name)
  }

  // The address is the start screen, because the web's gate shows sign-in at any address
  // and the start screen at this one once the round trip returns.
  private fun makeSignIn(): WebTab = WebTab("sign-in", "/", origin, isSignIn = true) { receive(it) }

  private fun signedIn(
    reported: List<Section>,
    profile: Profile,
  ) {
    this.profile = profile

    // Every page reports the session, so this is usually the same set again. A label can
    // change in place; a set with other sections or addresses rebuilds the tabs.
    val isSameSet = reported.map { it.id to it.path } == sections.map { it.id to it.path }
    sections = reported
    if (signIn == null && isSameSet) return

    // The tabs are built from what the session allowed, each with an empty history, and
    // a tab's webview when it is first shown. The sign-in webview is dropped rather than
    // promoted into a tab, so a back gesture cannot reach it; what it established
    // survives in the shared cookie jar. Tabs left from a session that ended are released
    // already, so none is kept.
    val kept = if (signIn == null) tabs.associateBy { it.id } else emptyMap()
    tabs =
      reported.map { section ->
        kept[section.id]?.takeIf { it.url.endsWith(section.path) }
          ?: WebTab(section.id, section.path, origin) { receive(it) }
      }
    if (signIn != null || tabs.none { it.id == activeSectionId }) {
      activeSectionId = reported.first().id
    }
    // Released by the view that held it, once it has left the screen – this runs inside
    // its own message callback.
    signIn = null
  }

  private fun signedOut() {
    // The sign-in webview reports this on every load while nobody is signed in.
    if (signIn != null) return
    // The tabs, their sections, and the profile stay as they were, so the signed-in
    // surface fades out whole rather than emptied. Their webviews are released by the
    // container that held them once it leaves, and the next sign-in replaces them all.
    signIn = makeSignIn()
  }
}
