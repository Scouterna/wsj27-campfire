package se.scouterna.campfire.web

import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import se.scouterna.campfire.Section
import java.util.Base64

/**
 * One item a screen offers in the bar – the primary action or an overflow entry. The
 * label is drawn natively, and the id goes back over the bridge when it is tapped.
 */
internal data class ScreenItem(
  val id: String,
  val label: String,
  /** A semantic icon name, mapped by `Section.icon`. */
  val icon: String? = null,
  /** Why the item cannot be chosen right now, drawn as a disabled item's subtitle. */
  val unavailable: String? = null,
)

/** The screen a tab's webview is showing, as the web last reported it. */
internal data class Screen(
  val title: String,
  val canGoBack: Boolean,
  val actions: List<ScreenItem>,
  /** Groups of overflow entries, drawn with a separator between them. */
  val menu: List<List<ScreenItem>>,
  /** Whether something on the page fills the screen, so the bars step aside for it. */
  val fullScreen: Boolean = false,
) {
  companion object {
    /** What a tab shows before its page has reported anything. */
    val EMPTY = Screen(title = "", canGoBack = false, actions = emptyList(), menu = emptyList())
  }
}

/**
 * Who is signed in, as far as the bar needs: the avatar's initials, and the address it
 * opens – on which it is not drawn.
 */
internal data class Profile(
  val initials: String,
  val path: String,
  /**
   * The picture drawn in place of the initials, as the image URL the web sent, or null
   * where the initials stand.
   */
  val avatar: String? = null,
) {
  /**
   * The picture's bytes, from a `data:` URL carrying base64. Any other scheme is one the
   * shell does not load, so the initials stand.
   */
  val avatarBytes: ByteArray?
    get() {
      val url = avatar ?: return null
      val comma = url.indexOf(',')
      if (!url.startsWith("data:") || comma < 0 || !url.substring(0, comma).endsWith(";base64")) {
        return null
      }
      // java.util.Base64 rather than android.util.Base64, which is a stub on a JVM test's
      // classpath.
      return try {
        Base64.getDecoder().decode(url.substring(comma + 1))
      } catch (_: IllegalArgumentException) {
        null
      }
    }
}

/** A message from the web application. */
internal sealed interface ToShell {
  data class ScreenReport(
    val screen: Screen,
  ) : ToShell

  data class SignedIn(
    val sections: List<Section>,
    val profile: Profile,
  ) : ToShell

  data object SignedOut : ToShell

  data class Theme(
    val name: String,
  ) : ToShell
}

/** A message to the web application. */
internal sealed interface ToWeb {
  /** Go back one layer. The web animates it, because no native swipe already has. */
  data object Back : ToWeb

  data object PopToRoot : ToWeb

  data class Action(
    val id: String,
  ) : ToWeb

  /** Show an origin-relative address, as a tapped link would. */
  data class Open(
    val path: String,
  ) : ToWeb

  val json: String
    get() {
      val message = JSONObject().put("v", Bridge.VERSION)
      when (this) {
        Back -> message.put("type", "back").put("animated", true)
        PopToRoot -> message.put("type", "popToRoot")
        is Action -> message.put("type", "action").put("id", id)
        is Open -> message.put("type", "open").put("path", path)
      }
      return message.toString()
    }
}

/**
 * The contract's Android half. `WebViewCompat.addWebMessageListener` carries it rather than
 * `addJavascriptInterface`, because it is the only one of the two that can be restricted to
 * an origin.
 */
internal object Bridge {
  /** The name of the object the web application posts to, injected on `window`. */
  const val CHANNEL_NAME = "campfire"

  /** The protocol version this shell speaks. A message carrying any other is dropped. */
  const val VERSION = 1

  /**
   * A message that does not parse, carries another version, or names a type this shell
   * does not know is dropped rather than guessed at.
   */
  fun decode(json: String): ToShell? {
    val message = parse(json) ?: return null
    if (message.optInt("v", -1) != VERSION) return null

    return when (message.optString("type")) {
      "screen" -> decodeScreen(message)
      "session" -> decodeSession(message)
      "theme" -> message.optString("name").ifEmpty { null }?.let { ToShell.Theme(it) }
      else -> null
    }
  }

  private fun decodeScreen(message: JSONObject): ToShell? {
    if (listOf("title", "canGoBack", "fullScreen").any { !message.has(it) }) return null
    val menu = message.optJSONArray("menu") ?: JSONArray()
    return ToShell.ScreenReport(
      Screen(
        title = message.optString("title"),
        canGoBack = message.optBoolean("canGoBack"),
        actions = decodeItems(message.optJSONArray("actions")),
        menu =
          (0 until menu.length())
            .map { index -> decodeItems(menu.optJSONArray(index)) }
            .filter { it.isNotEmpty() },
        fullScreen = message.optBoolean("fullScreen"),
      ),
    )
  }

  private fun decodeItems(items: JSONArray?): List<ScreenItem> =
    (0 until (items?.length() ?: 0)).mapNotNull { index ->
      val item = items?.optJSONObject(index) ?: return@mapNotNull null
      val id = item.optString("id")
      val label = item.optString("label")
      if (id.isEmpty() || label.isEmpty()) return@mapNotNull null
      ScreenItem(
        id = id,
        label = label,
        icon = item.optString("icon").ifEmpty { null },
        unavailable = item.optString("unavailable").ifEmpty { null },
      )
    }

  private fun decodeSession(message: JSONObject): ToShell? {
    if (!message.has("signedIn")) return null
    if (!message.optBoolean("signedIn")) return ToShell.SignedOut

    val entries = message.optJSONArray("sections") ?: return null
    val profile = message.optJSONObject("profile") ?: return null
    val initials = profile.optString("initials").ifEmpty { return null }
    val path = profile.optString("path").ifEmpty { return null }
    val sections =
      (0 until entries.length()).mapNotNull { index ->
        val entry = entries.optJSONObject(index) ?: return@mapNotNull null
        val id = entry.optString("id")
        val label = entry.optString("label")
        val sectionPath = entry.optString("path")
        val icon = entry.optString("icon")
        if (listOf(id, label, sectionPath, icon).any { it.isEmpty() }) return@mapNotNull null
        Section(id = id, label = label, path = sectionPath, icon = icon)
      }
    // Signed in with nowhere to go is not a state the shell can draw.
    if (sections.isEmpty()) return null
    val avatar = profile.optString("avatar").ifEmpty { null }
    return ToShell.SignedIn(sections, Profile(initials, path, avatar))
  }

  private fun parse(json: String): JSONObject? =
    try {
      JSONObject(json)
    } catch (_: JSONException) {
      null
    }
}
