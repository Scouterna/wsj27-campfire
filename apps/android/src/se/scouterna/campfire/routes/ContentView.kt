package se.scouterna.campfire.routes

import android.view.View
import android.widget.FrameLayout
import androidx.activity.compose.LocalActivity
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsBottomHeight
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.layout.windowInsetsTopHeight
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.view.WindowCompat
import se.scouterna.campfire.AppModel
import se.scouterna.campfire.theme.Palette
import se.scouterna.campfire.web.IdentitySheet
import se.scouterna.campfire.web.WebTab

/**
 * The gate: one full-screen webview while nobody is signed in, the tabs after. The two
 * cross-fade, so signing in or out reads as one surface giving way to the other.
 *
 * Signing out from a tab has already covered the tabs in the launch color by the time the
 * page says so, and the sign-in webview starts under the same color, so the one replaces
 * the other at once – two solid layers cross-fading would let the paper show through.
 */
@Composable
internal fun ContentView(model: AppModel) {
  val signIn = model.signIn
  val band =
    when {
      signIn != null -> model.theme.bright
      model.activeTab?.isLeaving == true -> model.theme.bright
      else -> Palette.paper
    }
  StatusBarIcons(isLight = band.luminance() < LIGHT_ICONS_BELOW)

  AnimatedContent(
    targetState = signIn,
    // Over the paper both surfaces stand on, so the window's own color, which the system
    // bars' bands are, never shows through the two half-faded surfaces.
    modifier = Modifier.fillMaxSize().background(Palette.paper),
    transitionSpec = {
      if (initialState == null && model.activeTab?.isLeaving == true) {
        EnterTransition.None togetherWith ExitTransition.None
      } else {
        fadeIn(tween(GATE_MILLIS)) togetherWith fadeOut(tween(GATE_MILLIS))
      }
    },
    label = "gate",
  ) { shown ->
    if (shown == null) {
      MainView(model = model)
    } else {
      SignInView(tab = shown, launch = model.theme.bright)
    }
  }
}

/**
 * The sign-in webview, with no bars – it is one screen with nowhere to go back to. Its
 * hero continues under the status bar in the launch color, and its white foot under the
 * navigation bar, so the page reads as reaching both edges. The round trip through the
 * identity provider that it starts runs in a sheet over it.
 */
@Composable
private fun SignInView(
  tab: WebTab,
  launch: Color,
) {
  Column(modifier = Modifier.fillMaxSize().background(Color.White)) {
    Box(Modifier.fillMaxWidth().windowInsetsTopHeight(WindowInsets.statusBars).background(launch))
    Box(
      modifier =
        Modifier
          .weight(1f)
          .fillMaxWidth()
          .background(launch)
          .windowInsetsPadding(WindowInsets.safeDrawing.only(WindowInsetsSides.Horizontal)),
    ) {
      AndroidView(
        factory = { context -> FrameLayout(context) },
        update = { container ->
          tab.activate(container.context)
          tab.webView?.let { attach(container, it) }
        },
        // The sign-in webview is dropped once someone is signed in, and released here,
        // once it has left the screen, rather than inside its own message callback.
        onRelease = { container ->
          container.removeAllViews()
          tab.destroy()
        },
        modifier = Modifier.fillMaxSize(),
      )
      TabOverlay(tab = tab, launch = launch)
    }
    // The launch color reaches the foot too while it covers the page, and leaves with it.
    val covered by animateFloatAsState(
      targetValue = if (tab.awaitsSession) 1f else 0f,
      animationSpec = tween(COVER_MILLIS, delayMillis = COVER_DELAY_MILLIS),
      label = "foot",
    )
    val foot = lerp(Color.White, launch, covered)
    Box(
      Modifier
        .fillMaxWidth()
        .windowInsetsBottomHeight(WindowInsets.navigationBars)
        .background(foot),
    )
  }

  tab.roundTrip?.let { roundTrip ->
    IdentitySheet(
      address = roundTrip,
      isReturn = tab::isOwnAddress,
      onReturn = tab::roundTripDidReturn,
      onClose = tab::roundTripDidEnd,
    )
  }
}

/**
 * Light status-bar icons while they sit on a dark band, and the activity's dark ones
 * again once the band, or the view, is gone. One owner for the whole gate, so a surface
 * leaving cannot put back the icons the surface replacing it has just set.
 */
@Composable
private fun StatusBarIcons(isLight: Boolean) {
  val window = LocalActivity.current?.window ?: return
  val view = LocalView.current
  DisposableEffect(window, isLight) {
    val controller = WindowCompat.getInsetsController(window, view)
    controller.isAppearanceLightStatusBars = !isLight
    onDispose { controller.isAppearanceLightStatusBars = true }
  }
}

/** Put a webview into a container, once, filling it. */
internal fun attach(
  container: FrameLayout,
  view: View,
) {
  if (view.parent === container) return
  (view.parent as? FrameLayout)?.removeView(view)
  container.addView(
    view,
    FrameLayout.LayoutParams(
      FrameLayout.LayoutParams.MATCH_PARENT,
      FrameLayout.LayoutParams.MATCH_PARENT,
    ),
  )
}

private const val GATE_MILLIS = 300

/** The luminance below which white icons read better on a band than black ones. */
private const val LIGHT_ICONS_BELOW = 0.4f
