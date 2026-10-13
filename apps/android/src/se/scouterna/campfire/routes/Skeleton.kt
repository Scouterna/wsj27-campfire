package se.scouterna.campfire.routes

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import se.scouterna.campfire.R
import se.scouterna.campfire.theme.Palette
import se.scouterna.campfire.web.WebTab

/**
 * What covers a webview until its page has drawn, or when its address cannot be reached:
 * the sign-in webview's launch surface, or a tab's skeleton, or the failure.
 */
@Composable
internal fun TabOverlay(
  tab: WebTab,
  launch: Color = Palette.blue.bright,
) {
  val failure = tab.error
  when {
    failure != null -> {
      Failure(tab = tab, message = failure)
    }

    // The app's page is covered until the session it reports says the sign-in screen is
    // what it drew.
    tab.isSignIn -> {
      LaunchCover(isShown = tab.awaitsSession, launch)
    }

    !tab.hasScreen && !tab.hasSettled -> {
      ListSkeleton()
    }
  }
}

/**
 * The launch window's color, so the system's starting window, this, and the page's hero
 * read as one surface rather than a screen to sit through. It fades rather than cuts,
 * and only once the page has had a frame to draw the hero beneath it.
 */
@Composable
private fun LaunchCover(
  isShown: Boolean,
  launch: Color,
) {
  AnimatedVisibility(
    visible = isShown,
    enter = EnterTransition.None,
    exit = fadeOut(tween(COVER_MILLIS, delayMillis = COVER_DELAY_MILLIS)),
  ) {
    Box(Modifier.fillMaxSize().background(launch))
  }
}

@Composable
private fun Failure(
  tab: WebTab,
  message: String,
) {
  Box(
    modifier = Modifier.fillMaxSize().background(Palette.paper),
    contentAlignment = Alignment.Center,
  ) {
    Column(
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalArrangement = Arrangement.spacedBy(8.dp),
      modifier = Modifier.padding(24.dp),
    ) {
      Text(
        stringResource(R.string.shell_unreachable_title),
        style = MaterialTheme.typography.titleLarge,
      )
      Text(
        "${tab.url}\n\n$message",
        style = MaterialTheme.typography.bodyMedium,
        textAlign = TextAlign.Center,
      )
      Button(onClick = { tab.load() }) { Text(stringResource(R.string.shell_unreachable_retry)) }
    }
  }
}

/**
 * A shimmering list in the pages' own layout, so a slow network shows the app's shapes
 * rather than a blank surface.
 */
@Composable
private fun ListSkeleton() {
  val transition = rememberInfiniteTransition(label = "skeleton")
  val pulse by transition.animateFloat(
    initialValue = 0f,
    targetValue = 1f,
    animationSpec = infiniteRepeatable(tween(BREATH_MILLIS), RepeatMode.Reverse),
    label = "breathing",
  )

  Column(
    modifier =
      Modifier
        .fillMaxSize()
        .background(Palette.paper)
        .padding(16.dp)
        .alpha(1f - pulse * BREATH_DEPTH),
  ) {
    Column(
      modifier =
        Modifier
          .fillMaxWidth()
          .background(Color.White, RoundedCornerShape(18.dp))
          .padding(20.dp),
      verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
      Bone(width = 140, height = 16)
      repeat(ROWS) {
        Row(
          horizontalArrangement = Arrangement.spacedBy(16.dp),
          verticalAlignment = Alignment.CenterVertically,
        ) {
          Box(Modifier.size(44.dp).background(Palette.bone, RoundedCornerShape(12.dp)))
          Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
            Bone(width = 190, height = 14)
            Bone(width = 130, height = 11)
          }
        }
      }
    }
  }
}

@Composable
private fun Bone(
  width: Int,
  height: Int,
) {
  Box(
    Modifier
      .size(
        width.dp,
        height.dp,
      ).background(Palette.bone, RoundedCornerShape((height / 2).dp)),
  )
}

/** How long the launch cover takes to fade, once the page has had a moment to draw. */
internal const val COVER_MILLIS = 200
internal const val COVER_DELAY_MILLIS = 100
private const val BREATH_MILLIS = 900
private const val BREATH_DEPTH = 0.35f
private const val ROWS = 5
