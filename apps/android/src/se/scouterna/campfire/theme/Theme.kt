// Named for the theme it builds, as its Apple twin is, though the palette is what it
// declares first.
@file:Suppress("MatchingDeclarationName")

package se.scouterna.campfire.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.sp
import se.scouterna.campfire.R

/**
 * The web's palette, so the native chrome and the pages read as one surface.
 *
 * The values are the web's color tokens in `libraries/ui/assets/styles/tokens.css`, and
 * the Apple shell carries the same names. A theme crosses the bridge as a name and is
 * mapped here, because a color never crosses it.
 */
internal object Palette {
  /**
   * The pages' background, carried by the chrome around the webview so the regions
   * beside it continue the page rather than showing the system background.
   */
  val paper = Color(0xFFF4F2EC)

  /** A skeleton's bones: the paper, one shade down. */
  val bone = Color(0xFFE6E4DE)

  /**
   * One unit's color identity: the bright ring of its badge, and the ink of its disc
   * that the controls, the tab indicator, and the large title wear.
   */
  data class Theme(
    val bright: Color,
    val ink: Color,
  )

  val blue = Theme(bright = Color(0xFF2A778A), ink = Color(0xFF215262))

  private val themes =
    mapOf(
      "blue" to blue,
      "brown" to Theme(bright = Color(0xFF985B15), ink = Color(0xFF643D14)),
      "green" to Theme(bright = Color(0xFF768B33), ink = Color(0xFF526125)),
      "red" to Theme(bright = Color(0xFFCD4B17), ink = Color(0xFF9B3716)),
      "yellow" to Theme(bright = Color(0xFFF4C125), ink = Color(0xFFC3900B)),
    )

  /**
   * The theme a name reported by the web stands for. An unknown name is blue, the
   * contingent's own, because the web may lead the shell by a release.
   */
  fun theme(named: String): Theme = themes[named] ?: blue
}

private val ink = Color(0xFF1A1A1A)

/** Bravely Script, the contingent's display face, drawn in one weight. */
private val bravely = FontFamily(Font(R.font.bravely_script))

/**
 * A Material 3 theme in the web's palette and the person's unit color. The web draws no
 * dark theme, so neither does the chrome around it.
 */
@Composable
internal fun CampfireTheme(
  theme: Palette.Theme,
  content: @Composable () -> Unit,
) {
  val base = Typography()
  MaterialTheme(
    colorScheme =
      lightColorScheme(
        primary = theme.ink,
        onPrimary = Color.White,
        primaryContainer = theme.ink,
        onPrimaryContainer = Color.White,
        // The selected tab's pill, the ink thinned onto the bar as the web's wash is.
        secondaryContainer = theme.ink.copy(alpha = 0.14f),
        onSecondaryContainer = theme.ink,
        background = Palette.paper,
        onBackground = ink,
        surface = Palette.paper,
        onSurface = ink,
        surfaceContainer = Color.White,
        surfaceContainerLow = Color.White,
        surfaceContainerHigh = Color.White,
      ),
    // Bravely Script for the large title alone, which a large top bar draws in the
    // headline style. The title it collapses into is the title style, which stays the
    // system face – the same split the web makes between display and body text.
    typography =
      base.copy(
        headlineMedium =
          base.headlineMedium.copy(
            fontFamily = bravely,
            fontSize = 40.sp,
            lineHeight = 44.sp,
            color = theme.ink,
          ),
      ),
    content = content,
  )
}
