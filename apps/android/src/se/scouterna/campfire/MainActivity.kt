package se.scouterna.campfire

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource

/**
 * The shell's one activity, drawing one screen so that the project, the flavors, and the
 * toolchain have something to build and run.
 */
class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()

    setContent {
      // Plain white or black from the system appearance rather than Material's tinted
      // surfaces, matching the Apple shell. enableEdgeToEdge reads the same setting for
      // the status bar icons, so the two always contrast.
      val dark = isSystemInDarkTheme()

      MaterialTheme {
        // The surface fills the window and the inset sits inside it, so its color runs
        // under the transparent system bars – padding the surface itself would leave the
        // launch window's blue showing through behind them.
        Surface(
          modifier = Modifier.fillMaxSize(),
          color = if (dark) Color.Black else Color.White,
          contentColor = if (dark) Color.White else Color.Black,
        ) {
          Box(
            modifier = Modifier.fillMaxSize().safeDrawingPadding(),
            contentAlignment = Alignment.Center,
          ) {
            Text(text = stringResource(R.string.app_name))
          }
        }
      }
    }
  }
}
