package se.scouterna.campfire

import android.content.Context
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.content.edit
import se.scouterna.campfire.routes.ContentView
import se.scouterna.campfire.theme.CampfireTheme

/**
 * The shell. It owns the phone's chrome and nothing else: every word a user reads, apart
 * from the failure message and the bar controls' spoken names, comes from the web.
 *
 * The activity declares its own configuration changes in the manifest, so a rotation or
 * a new text size keeps the webviews it holds rather than reloading every tab.
 */
class MainActivity : ComponentActivity() {
  private val preferences by lazy { getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE) }

  // The theme is remembered so the next launch wears the person's unit color from its
  // first frame, rather than the contingent's blue until the web has loaded and said.
  private val model by lazy {
    AppModel(Config.webOrigin, preferences.getString(THEME, null)) { name ->
      preferences.edit { putString(THEME, name) }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        splashScreen.setSplashScreenTheme(launchTheme(name))
      }
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    // Dark system icons on transparent bars, because the chrome is the web's light paper
    // and the web draws no dark theme.
    enableEdgeToEdge(
      statusBarStyle = SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT),
      navigationBarStyle = SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT),
    )

    setContent {
      CampfireTheme(theme = model.theme) {
        ContentView(model = model)
      }
    }
  }

  private companion object {
    const val PREFERENCES = "campfire"

    /** The key the last theme worn is remembered under, between launches. */
    const val THEME = "theme"

    /**
     * The starting window's theme for a theme name, so the system's own launch surface
     * wears the remembered color too. An unknown name is blue, as it is in the palette.
     */
    fun launchTheme(name: String): Int =
      when (name) {
        "brown" -> R.style.Theme_Campfire_Brown
        "green" -> R.style.Theme_Campfire_Green
        "red" -> R.style.Theme_Campfire_Red
        "yellow" -> R.style.Theme_Campfire_Yellow
        else -> R.style.Theme_Campfire
      }
  }
}
