package se.scouterna.campfire.web

import android.annotation.SuppressLint
import android.content.Context
import android.content.res.Configuration
import android.view.MotionEvent
import android.view.VelocityTracker
import android.view.ViewConfiguration
import android.webkit.WebView
import androidx.core.view.NestedScrollingChild3
import androidx.core.view.NestedScrollingChildHelper
import androidx.core.view.ViewCompat
import kotlin.math.hypot
import kotlin.math.roundToInt

/**
 * A `WebView` that takes part in nested scrolling, so the top bar's large title collapses
 * as the page is dragged up and opens again as it is dragged down at the top.
 *
 * A plain `WebView` scrolls itself and tells no parent, so nothing outside it can follow
 * the page. This one offers every drag to the parents first, and hands the page only
 * what they left.
 *
 * The page is fed its touches in screen space, shifted by everything the parents took.
 * The bar moves the webview as it collapses, which shifts the view's own coordinates a
 * frame late; screen space is free of that lag, so the page never scrolls by what the bar
 * already consumed, however the frames fall.
 *
 * A drag the parents took whole reaches the page as a press that never moved, which the
 * page would read as a tap, so such a gesture ends in a cancel rather than a release.
 */
internal class NestedWebView(
  context: Context,
) : WebView(context),
  NestedScrollingChild3 {
  private val helper = NestedScrollingChildHelper(this).apply { isNestedScrollingEnabled = true }
  private val consumed = IntArray(2)
  private val offset = IntArray(2)

  /** Where the finger last was, in screen space. */
  private var lastRawY = 0f

  /** Where the page was told the gesture started, and how far the parents have taken it. */
  private var originY = 0f
  private var originRawY = 0f
  private var originRawX = 0f
  private var taken = 0

  /** The distance past which a moving finger is a drag rather than a press. */
  private val touchSlop = ViewConfiguration.get(context).scaledTouchSlop

  /** Whether the finger has dragged, and whether the page has seen it drag. */
  private var hasDragged = false
  private var hasPageDragged = false

  /** The drag's speed, in screen space, for the fling that settles the bar on release. */
  private var velocity: VelocityTracker? = null

  /** Whether a finger is on the page, so a scroll it causes is told from the page's own. */
  var isTouching = false
    private set

  /** Called whenever the page's scroll position changes, with the new position. */
  var onScrollChange: ((scrollY: Int) -> Unit)? = null

  // The click a press ends in is the page's to handle, through the touch events
  // forwarded below, so there is no separate click to perform.
  @SuppressLint("ClickableViewAccessibility")
  override fun onTouchEvent(event: MotionEvent): Boolean {
    when (event.actionMasked) {
      MotionEvent.ACTION_DOWN -> {
        isTouching = true
        lastRawY = event.rawY
        originY = event.y
        originRawY = event.rawY
        originRawX = event.rawX
        taken = 0
        hasDragged = false
        hasPageDragged = false
        velocity?.recycle()
        velocity = VelocityTracker.obtain()
        track(event)
        startNestedScroll(ViewCompat.SCROLL_AXIS_VERTICAL, ViewCompat.TYPE_TOUCH)
      }

      MotionEvent.ACTION_MOVE -> {
        track(event)
        val dy = (lastRawY - event.rawY).toInt()
        lastRawY = event.rawY
        consumed.fill(0)
        dispatchNestedPreScroll(0, dy, consumed, offset, ViewCompat.TYPE_TOUCH)
        val preConsumed = consumed[1]
        taken += preConsumed
        val result = forward(event)
        // The page scrolls on its own thread, so its position here is a frame old and
        // what it took from this move cannot be measured. What it could not take is
        // known, though: a drag down at its top, or up at its end, which the parents get.
        val rest = dy - preConsumed
        val canTake = if (rest < 0) canScrollVertically(-1) else canScrollVertically(1)
        val unconsumed = if (canTake) 0 else rest
        consumed.fill(0)
        dispatchNestedScroll(
          0,
          rest - unconsumed,
          0,
          unconsumed,
          offset,
          ViewCompat.TYPE_TOUCH,
          consumed,
        )
        taken += consumed[1]
        return result
      }

      MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
        isTouching = false
        track(event)
        // The bar settles on a fling, open or closed, rather than resting halfway. The
        // page flings its own content; the parents only hear of it.
        val tracker = velocity
        if (tracker != null && event.actionMasked == MotionEvent.ACTION_UP) {
          tracker.computeCurrentVelocity(MILLISECONDS_PER_SECOND)
          val fling = -tracker.yVelocity
          dispatchNestedPreFling(0f, fling)
          dispatchNestedFling(0f, fling, true)
        }
        velocity?.recycle()
        velocity = null
        stopNestedScroll(ViewCompat.TYPE_TOUCH)
      }
    }
    val isTakenDrag = event.actionMasked == MotionEvent.ACTION_UP && hasDragged && !hasPageDragged
    return if (isTakenDrag) cancel(event) else forward(event)
  }

  /** Ends the gesture for the page without the release it would read as a tap. */
  private fun cancel(event: MotionEvent): Boolean {
    val cancel = MotionEvent.obtain(event)
    cancel.action = MotionEvent.ACTION_CANCEL
    val result = forward(cancel)
    cancel.recycle()
    return result
  }

  /** Feeds the velocity tracker in screen space, which the bar's movement cannot skew. */
  private fun track(event: MotionEvent) {
    val screen = MotionEvent.obtain(event)
    screen.setLocation(event.rawX, event.rawY)
    velocity?.addMovement(screen)
    screen.recycle()
  }

  /** The event as the page should see it: in screen space, less what the parents took. */
  private fun forward(event: MotionEvent): Boolean {
    val dx = event.rawX - originRawX
    val dy = event.rawY - originRawY
    if (hypot(dx, dy) > touchSlop) hasDragged = true
    if (hypot(dx, dy + taken) > touchSlop) hasPageDragged = true
    val shifted = MotionEvent.obtain(event)
    shifted.offsetLocation(0f, originY + dy + taken - event.y)
    val result = super.onTouchEvent(shifted)
    shifted.recycle()
    return result
  }

  override fun onScrollChanged(
    left: Int,
    top: Int,
    oldLeft: Int,
    oldTop: Int,
  ) {
    super.onScrollChanged(left, top, oldLeft, oldTop)
    if (top != oldTop) onScrollChange?.invoke(top)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    // A webview reads the system's text size once, when it is built, and the activity
    // outlives a change of it rather than being rebuilt, so the page is told here.
    settings.textZoom = (newConfig.fontScale * PERCENT).roundToInt()
  }

  override fun startNestedScroll(
    axes: Int,
    type: Int,
  ): Boolean = helper.startNestedScroll(axes, type)

  override fun stopNestedScroll(type: Int) = helper.stopNestedScroll(type)

  override fun hasNestedScrollingParent(type: Int): Boolean = helper.hasNestedScrollingParent(type)

  override fun dispatchNestedPreScroll(
    dx: Int,
    dy: Int,
    consumed: IntArray?,
    offsetInWindow: IntArray?,
    type: Int,
  ): Boolean = helper.dispatchNestedPreScroll(dx, dy, consumed, offsetInWindow, type)

  override fun dispatchNestedScroll(
    dxConsumed: Int,
    dyConsumed: Int,
    dxUnconsumed: Int,
    dyUnconsumed: Int,
    offsetInWindow: IntArray?,
    type: Int,
    consumed: IntArray,
  ) = helper.dispatchNestedScroll(
    dxConsumed,
    dyConsumed,
    dxUnconsumed,
    dyUnconsumed,
    offsetInWindow,
    type,
    consumed,
  )

  override fun dispatchNestedScroll(
    dxConsumed: Int,
    dyConsumed: Int,
    dxUnconsumed: Int,
    dyUnconsumed: Int,
    offsetInWindow: IntArray?,
    type: Int,
  ): Boolean =
    helper.dispatchNestedScroll(
      dxConsumed,
      dyConsumed,
      dxUnconsumed,
      dyUnconsumed,
      offsetInWindow,
      type,
    )

  override fun setNestedScrollingEnabled(enabled: Boolean) {
    // The helper is built in the constructor, after WebView's own constructor has
    // already called this.
    @Suppress("SENSELESS_COMPARISON")
    if (helper != null) helper.isNestedScrollingEnabled = enabled
  }

  override fun isNestedScrollingEnabled(): Boolean = helper.isNestedScrollingEnabled

  override fun dispatchNestedPreFling(
    velocityX: Float,
    velocityY: Float,
  ): Boolean = helper.dispatchNestedPreFling(velocityX, velocityY)

  override fun dispatchNestedFling(
    velocityX: Float,
    velocityY: Float,
    consumed: Boolean,
  ): Boolean = helper.dispatchNestedFling(velocityX, velocityY, consumed)

  private companion object {
    const val MILLISECONDS_PER_SECOND = 1000
    const val PERCENT = 100
  }
}
