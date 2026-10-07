package se.scouterna.campfire

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AccountBox
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Search
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.unit.dp

/**
 * One section the signed-in person may open, drawn as a tab.
 *
 * Which sections exist is the web's to say, from the person's roles, and the shell draws
 * what it is told. Only the icon is the shell's own, because the bridge carries a
 * semantic name and never a glyph.
 */
internal data class Section(
  val id: String,
  val label: String,
  val path: String,
  /** The semantic icon name the web reported. */
  val icon: String,
) {
  companion object {
    /**
     * The bridge's icon vocabulary, as the web application names it. A name the web
     * sends and this map lacks draws the neutral shape, because the web may lead the
     * shell by a release.
     */
    fun icon(name: String): ImageVector = icons[name] ?: neutral

    // Lazy, because the glyphs it holds are declared below it.
    private val icons: Map<String, ImageVector> by lazy {
      mapOf(
        "back" to Icons.AutoMirrored.Filled.ArrowBack,
        "book" to book,
        "chat" to chat,
        "check" to Icons.Filled.Check,
        "copy" to copy,
        "folder" to folder,
        "home" to Icons.Filled.Home,
        "idcard" to Icons.Filled.AccountBox,
        "leaf" to leaf,
        "mail" to Icons.Filled.Email,
        "more" to Icons.Filled.MoreVert,
        "participants" to people,
        "phone" to Icons.Filled.Call,
        "search" to Icons.Filled.Search,
      )
    }

    // The Material glyphs the core icon set lacks, drawn from their own path data.
    private val book =
      glyph(
        "book",
        "M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 " +
          "4h5v8l-2.5-1.5L6 12V4z",
      )
    private val chat =
      glyph("chat", "M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z")
    private val copy =
      glyph(
        "copy",
        "M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 " +
          "0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z",
      )
    private val leaf =
      glyph(
        "leaf",
        "M6.05 8.05c-2.73 2.73-2.73 7.15-.02 9.88 1.47-3.4 4.09-6.24 7.37-7.93-2.78 2.34-4.73 " +
          "5.61-5.39 9.32 2.6 1.23 5.8.78 7.95-1.37C19.43 14.47 20 4 20 4S9.53 4.57 6.05 8.05z",
      )
    private val people =
      glyph(
        "people",
        "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 " +
          "0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 " +
          "3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 " +
          "1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
      )
    private val folder =
      glyph(
        "folder",
        "M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2" +
          "-2z",
      )
    private val neutral =
      glyph("neutral", "M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2z")

    /** The Material grid every icon is drawn on, in dp and in path units alike. */
    private const val GLYPH = 24f

    private fun glyph(
      name: String,
      path: String,
    ): ImageVector =
      ImageVector
        .Builder(name, GLYPH.dp, GLYPH.dp, GLYPH, GLYPH)
        .addPath(PathParser().parsePathString(path).toNodes(), fill = SolidColor(Color.Black))
        .build()
  }
}
