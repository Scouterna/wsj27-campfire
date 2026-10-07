package se.scouterna.campfire.routes

import android.webkit.WebView
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animate
import androidx.compose.animation.core.tween
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshots.Snapshot
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.layout.layout
import androidx.compose.ui.unit.offset
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import kotlin.coroutines.resume
import kotlin.math.roundToInt

/**
 * How far the webview is drawn from where it is laid out as it is given the whole window,
 * and whether the bars may leave yet.
 *
 * A webview given a new size keeps showing its last frame, at the old size, until its
 * page has drawn at the new one, which can take longer than any bar takes to leave. So
 * the webview is held where it was, under bars that stay, until that frame is ready, and
 * only then do the bars leave and the page glide into place, over content that is there.
 */
internal class Glide {
  var offset by mutableStateOf(Offset.Zero)
    private set

  /** Whether the webview has drawn at the size it was given, so the bars may leave. */
  var isReleased by mutableStateOf(false)
    private set

  private var wasFullScreen: Boolean? = null

  // Set when filling the screen begins and cleared once the starting offset is known,
  // which only the page's own composition can measure.
  private var isPlacing = false

  // The webview's size before the change, which its first new frame differs from.
  private var heldWidth = 0
  private var heldHeight = 0

  /**
   * Holds the bars when filling the screen begins, and lets everything go when it ends.
   * Called during composition, before anything reads whether the bars may leave.
   *
   * @param view the webview about to be given the whole window, still at its old size
   */
  fun begin(
    isFullScreen: Boolean,
    view: WebView?,
  ) {
    val was = wasFullScreen
    wasFullScreen = isFullScreen
    if (was == isFullScreen) return
    // Chrome drawn first over a page already filling the screen has nothing to wait for.
    isReleased = was == null
    isPlacing = isFullScreen && was != null
    heldWidth = view?.width ?: 0
    heldHeight = view?.height ?: 0
    if (!isFullScreen) offset = Offset.Zero
  }

  /**
   * Starts from the whole change when filling the screen has just begun, given where the
   * webview sits outside full screen relative to where it sits in it. Called during
   * composition, so the first frame of the new geometry is already drawn in place.
   */
  fun place(outside: () -> Offset) {
    if (!isPlacing) return
    isPlacing = false
    // Read without subscribing, because only the moment of the change matters, and the
    // title's offset changes on every frame of a scroll.
    offset = Snapshot.withoutReadObservation(outside)
  }

  /**
   * Waits for the webview's first frame at its new size, or for as long as any webview
   * takes to draw one, then lets the bars leave and glides the page into place.
   */
  suspend fun release(view: WebView?) {
    if (isReleased || wasFullScreen != true) return
    withTimeoutOrNull(HOLD_MILLIS) { if (view != null) awaitResizedFrame(view) }
    isReleased = true
    val from = offset
    if (from == Offset.Zero) return
    // The bars start leaving in the frame after the one that recomposes them, so the
    // glide waits that frame too, and the page moves with them rather than ahead.
    withFrameNanos {}
    animate(1f, 0f, animationSpec = tween(GLIDE_MILLIS, easing = FastOutSlowInEasing)) { f, _ ->
      offset = from * f
    }
  }

  private suspend fun awaitResizedFrame(view: WebView) {
    // The new size reaches the webview in a layout pass after the composition that set it.
    while (view.width == heldWidth && view.height == heldHeight) withFrameNanos {}
    // Answered once the page's state as of now, its new size included, is ready to draw.
    suspendCancellableCoroutine { continuation ->
      view.postVisualStateCallback(
        0,
        object : WebView.VisualStateCallback() {
          override fun onComplete(requestId: Long) {
            if (continuation.isActive) continuation.resume(Unit)
          }
        },
      )
    }
  }
}

/**
 * Keeps the top bar out of the rail's place for as long as the page is drawn beside the
 * rail, because the page, the bar's included, is laid across that place as soon as
 * filling the screen begins.
 */
internal fun Modifier.besideRail(glide: Glide): Modifier =
  layout { measurable, constraints ->
    val start = glide.offset.x.roundToInt()
    val placeable = measurable.measure(constraints.offset(horizontal = -start))
    layout(placeable.width + start, placeable.height) { placeable.place(start, 0) }
  }

/** As long as the web's own grow and shrink, so the page arrives as they end. */
private const val GLIDE_MILLIS = 300

/** Longer than any webview takes to draw at a new size, after which the bars leave anyway. */
private const val HOLD_MILLIS = 1_000L
