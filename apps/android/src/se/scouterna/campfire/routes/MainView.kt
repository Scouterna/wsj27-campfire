package se.scouterna.campfire.routes

import android.content.res.Configuration
import android.graphics.BitmapFactory
import android.webkit.WebView
import android.widget.FrameLayout
import androidx.activity.compose.BackHandler
import androidx.activity.compose.LocalActivity
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.SizeTransform
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animate
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.snap
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.calculateEndPadding
import androidx.compose.foundation.layout.calculateStartPadding
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.displayCutout
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.imeAnimationTarget
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsIgnoringVisibility
import androidx.compose.foundation.layout.union
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.TextAutoSize
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LargeTopAppBar
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.TopAppBarScrollBehavior
import androidx.compose.material3.TopAppBarState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.layout.layout
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.core.view.children
import se.scouterna.campfire.AppModel
import se.scouterna.campfire.R
import se.scouterna.campfire.Section
import se.scouterna.campfire.theme.Palette
import se.scouterna.campfire.web.Profile
import se.scouterna.campfire.web.ScreenItem
import se.scouterna.campfire.web.WebTab

/**
 * The chrome once someone is signed in: a top bar showing whatever the active tab's page
 * last reported, and the tabs – a bar along the bottom in portrait, a rail along the side
 * in landscape, where the height is too short to spend on both bars.
 *
 * Something filling the screen has every bar step aside for it, the system's included:
 * the page is given the whole window at once, the bars stay over it until it has drawn at
 * its new size, and then slide away together as it glides into place. They come back
 * together in one step, with the page in its place between them.
 */
@Composable
internal fun MainView(model: AppModel) {
  val active = model.activeTab
  val isLandscape = LocalConfiguration.current.orientation == Configuration.ORIENTATION_LANDSCAPE
  val isFullScreen = active.fillsScreen

  // Back first returns whatever fills the screen, which the web does on the same message,
  // and otherwise applies wherever the page says it does. At a tab's first screen it
  // sends the app to the background rather than closing it, as the system does for an
  // app opened from the launcher, so returning finds every tab where it was left.
  val activity = LocalActivity.current
  BackHandler {
    if (isFullScreen || active?.screen?.canGoBack == true) {
      active?.goBack()
    } else {
      activity?.moveTaskToBack(true)
    }
  }

  val glide = remember { Glide() }
  glide.begin(isFullScreen, active?.webView)
  LaunchedEffect(isFullScreen) { glide.release(active?.webView) }
  val isAside = isFullScreen && glide.isReleased
  Immersive(isOn = isAside)

  // The rail's width, as last measured, which the page glides across as it comes or goes.
  val rail = remember { RailWidth() }
  Box {
    RailBeside(
      showsRail = isLandscape && !isFullScreen,
      width = rail,
      rail = {
        if (isLandscape) {
          Box(Modifier.stepAside(isAside, Edge.Start)) { TabRail(model) }
        }
      },
    ) { hasRail ->
      // The rail has taken the start side's insets, so nothing beside it takes them again.
      val railInsets = chromeInsets.only(WindowInsetsSides.Start)
      Box(modifier = if (hasRail) Modifier.consumeWindowInsets(railInsets) else Modifier) {
        TabPage(
          model = model,
          active = active,
          isLandscape = isLandscape,
          railWidth = rail,
          glide = glide,
          isAside = isAside,
        )
      }
    }
    // Signing out leaves the page blank under the signed-in chrome, and then draws the
    // sign-in screen there. The launch color covers both, as it covers the sign-in
    // webview that replaces the tabs until its page has drawn.
    AnimatedVisibility(
      visible = active?.isLeaving == true,
      enter = fadeIn(tween(COVER_MILLIS)),
      exit = fadeOut(tween(COVER_MILLIS)),
    ) {
      Box(Modifier.fillMaxSize().background(model.theme.bright))
    }
  }
}

/**
 * The page with the rail laid over its start side. The page is moved aside for the rail
 * only while the rail is meant to show, so the rail sliding away leaves the page's size
 * changed once, before it starts, rather than again when it has gone.
 */
@Composable
private fun RailBeside(
  showsRail: Boolean,
  width: RailWidth,
  rail: @Composable () -> Unit,
  page: @Composable (hasRail: Boolean) -> Unit,
) {
  Layout(
    contents = listOf(rail, { page(showsRail) }),
    modifier = Modifier.fillMaxSize().background(Palette.paper),
  ) { (rails, pages), constraints ->
    val railPlaceables = rails.map { it.measure(constraints.copy(minWidth = 0)) }
    railPlaceables.maxOfOrNull { it.width }?.takeIf { it > 0 }?.let { width.px = it }
    val start = if (showsRail) width.px else 0
    val pageConstraints = Constraints.fixed(constraints.maxWidth - start, constraints.maxHeight)
    val pagePlaceables = pages.map { it.measure(pageConstraints) }
    layout(constraints.maxWidth, constraints.maxHeight) {
      pagePlaceables.forEach { it.place(start, 0) }
      railPlaceables.forEach { it.place(0, 0) }
    }
  }
}

/** Where a bar leaves the screen for, when something fills it. */
private enum class Edge { Bottom, None, Start, Top }

/**
 * Slides and fades a bar away while something fills the screen, and puts it back at once
 * after. The bar keeps its size throughout and is only no longer placed once it has gone,
 * so the room the page is given never changes under a moving bar, and a gone bar takes
 * no touch. A bar with no edge to leave by shrinks where it stands.
 *
 * Coming back is not animated, because the page is given its smaller room in the same
 * frame, and a bar still on its way would leave the band it returns to bare.
 */
@Composable
private fun Modifier.stepAside(
  isAside: Boolean,
  edge: Edge,
): Modifier {
  val animated by animateFloatAsState(
    targetValue = if (isAside) 1f else 0f,
    animationSpec = if (isAside) tween(BARS_MILLIS, easing = FastOutSlowInEasing) else snap(),
    label = "step aside",
  )
  // Read in the frame the change is composed in, where the animation answers a frame late.
  val progress = if (isAside) animated else 0f
  return layout { measurable, constraints ->
    val placeable = measurable.measure(constraints)
    layout(placeable.width, placeable.height) {
      if (progress == 1f) return@layout
      placeable.placeWithLayer(0, 0) {
        alpha = 1f - progress
        when (edge) {
          Edge.Bottom -> {
            translationY = progress * placeable.height
          }

          Edge.Start -> {
            translationX = -progress * placeable.width
          }

          Edge.Top -> {
            translationY = -progress * placeable.height
          }

          Edge.None -> {
            scaleX = 1f - progress
            scaleY = 1f - progress
          }
        }
      }
    }
  }
}

/** The rail's width in pixels, as it was last laid out. */
private class RailWidth {
  var px = 0
}

/**
 * Hides the system bars while something fills the screen, as a full-screen map or photo
 * does, leaving a swipe from the edge to bring them back for a moment.
 */
@Composable
private fun Immersive(isOn: Boolean) {
  val window = LocalActivity.current?.window ?: return
  val view = LocalView.current
  DisposableEffect(window, isOn) {
    val controller = WindowCompat.getInsetsController(window, view)
    if (isOn) {
      controller.systemBarsBehavior =
        WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
      controller.hide(WindowInsetsCompat.Type.systemBars())
    }
    onDispose { if (isOn) controller.show(WindowInsetsCompat.Type.systemBars()) }
  }
}

/**
 * The system bars' and the cutout's insets whether the bars show or not, so the chrome
 * keeps one geometry while the bars hide and come back for something filling the screen.
 */
@OptIn(ExperimentalLayoutApi::class)
private val chromeInsets: WindowInsets
  @Composable get() = WindowInsets.systemBarsIgnoringVisibility.union(WindowInsets.displayCutout)

/**
 * The active tab: its top bar over its webview.
 *
 * The webview is never resized as the large title collapses, because a page whose
 * viewport changes height every frame relayouts every frame. It is laid out below the
 * collapsed bar instead, and slid down by however much of the large title is still open –
 * its foot, pushed below the tab bar while the title is open, is reached only once the
 * page scrolls, which collapses the title first.
 *
 * Something filling the screen gives the webview the whole window, which the bars slide
 * away over once it has drawn at that size. The webview is drawn where it was and glides
 * into its new place, so the page does not jump with the change of geometry, and what
 * fills the screen grows from where it was drawn. Leaving puts the webview and the bars
 * in their places in one frame, where what filled the screen still covers the page and
 * shrinks back into it.
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
private fun TabPage(
  model: AppModel,
  active: WebTab?,
  isLandscape: Boolean,
  railWidth: RailWidth,
  glide: Glide,
  isAside: Boolean,
) {
  // One bar state per tab, so a tab left with its title collapsed returns that way, and
  // per orientation, because the small bar draws a large title's collapse as its own
  // height and would vanish under it.
  val states = remember { mutableMapOf<Pair<String, Boolean>, TopAppBarState>() }
  val state =
    states.getOrPut(
      active?.id.orEmpty() to isLandscape,
    ) { TopAppBarState(-Float.MAX_VALUE, 0f, 0f) }
  val behavior =
    if (isLandscape) {
      TopAppBarDefaults.pinnedScrollBehavior(state)
    } else {
      TopAppBarDefaults.exitUntilCollapsedScrollBehavior(state)
    }
  if (active != null && !isLandscape) FollowPageScroll(active, state)

  val density = LocalDensity.current
  // How far the large title collapses, which a landscape bar, pinned and small, does not.
  val range =
    TopAppBarDefaults.LargeAppBarExpandedHeight - TopAppBarDefaults.LargeAppBarCollapsedHeight
  val collapsePx = if (isLandscape) 0f else with(density) { range.toPx() }
  val top = chromeInsets.asPaddingValues().calculateTopPadding()
  val isFullScreen = active.fillsScreen

  // The webview's place on the screen outside full screen, measured from its place in
  // it: across the rail, and below the bars and as much of the large title as is open.
  glide.place {
    Offset(
      x = if (isLandscape) railWidth.px.toFloat() else 0f,
      y =
        with(density) { (top + TopAppBarDefaults.LargeAppBarCollapsedHeight).toPx() } +
          collapsePx + state.heightOffset,
    )
  }

  Scaffold(
    // A drag on what fills the screen is the page's alone, with no title to collapse.
    modifier =
      if (isFullScreen) {
        Modifier
      } else {
        Modifier.nestedScroll(
          behavior.nestedScrollConnection,
        )
      },
    containerColor = Palette.paper,
    contentWindowInsets = chromeInsets,
    topBar = {
      Box(Modifier.besideRail(glide).stepAside(isAside, Edge.Top)) {
        TopBar(model = model, tab = active, behavior = behavior, isLandscape = isLandscape)
      }
    },
    bottomBar = {
      if (!isLandscape) Box(Modifier.stepAside(isAside, Edge.Bottom)) { TabBar(model) }
    },
    floatingActionButton = {
      if (active != null) {
        Box(Modifier.stepAside(isAside, Edge.None)) { PrimaryAction(tab = active) }
      }
    },
  ) { padding ->
    val direction = LocalLayoutDirection.current
    val place = if (isFullScreen) PaddingValues(0.dp) else pagePadding(padding, top, direction)
    // A page filling the screen has no large title to slide below.
    val below = { if (isFullScreen) 0f else collapsePx + state.heightOffset }
    PageView(model = model, active = active, place = place, glide = glide, below = below)
  }
}

/**
 * The active tab's webview, or its placeholder over it, in the place the bars leave it.
 *
 * @param place the room the bars leave the page
 * @param below how far the large title still open pushes the page down, read on every
 *   frame rather than on every composition
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun PageView(
  model: AppModel,
  active: WebTab?,
  place: PaddingValues,
  glide: Glide,
  below: () -> Float,
) {
  val slid =
    Modifier.graphicsLayer {
      translationX = glide.offset.x
      translationY = glide.offset.y + below()
    }
  Box(
    modifier =
      Modifier
        .fillMaxSize()
        .padding(place)
        .consumeWindowInsets(place)
        // The window is drawn edge to edge, so nothing makes room for the keyboard but
        // this. Where it is going rather than where it is, so the page is resized once
        // as the keyboard opens rather than on every frame of its slide.
        .windowInsetsPadding(WindowInsets.imeAnimationTarget)
        // The webview's foot, slid below the tab bar while the title is open, must not
        // show under the bar.
        .clipToBounds(),
  ) {
    AndroidView(
      // Compose hears a nested scroll only from a hosted view that takes part in nested
      // scrolling, and the hosted view is this container rather than the webview in it.
      factory = { context -> FrameLayout(context).apply { isNestedScrollingEnabled = true } },
      update = { container -> showTab(container, model) },
      // Signing out drops the tabs with the view, and a webview left undestroyed keeps
      // its page running.
      onRelease = { container ->
        container.children.forEach { (it as? WebView)?.destroy() }
        container.removeAllViews()
      },
      modifier = Modifier.fillMaxSize().then(slid),
    )
    // Slid with the webview, so the placeholder starts where the page will.
    if (active != null) Box(slid) { TabOverlay(tab = active) }
  }
}

/** Whether the tab's page has something filling the screen, which no tab at all has not. */
private val WebTab?.fillsScreen: Boolean
  get() = this?.screen?.fullScreen == true

/** Where the webview sits: below the collapsed top bar, and inside the rest. */
private fun pagePadding(
  padding: PaddingValues,
  top: Dp,
  direction: LayoutDirection,
): PaddingValues =
  PaddingValues(
    top = top + TopAppBarDefaults.LargeAppBarCollapsedHeight,
    bottom = padding.calculateBottomPadding(),
    start = padding.calculateStartPadding(direction),
    end = padding.calculateEndPadding(direction),
  )

/**
 * Keeps the large title in step with a scroll the finger did not make – a push that
 * starts the new page at its top, a pop that restores a page further down, a reselect
 * gliding up. The rule is the one a drag leaves behind anyway: open at the top, closed
 * anywhere below it.
 *
 * Filling the screen and leaving it are not a new screen, so the bar comes back as the
 * reader left it, collapsed by a drag at the top included.
 *
 * A navigation moves the page's scroll before the page has reported the screen it moved
 * to, so the bar waits for that report and opens or closes as the new title arrives,
 * rather than opening the old title large.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FollowPageScroll(
  tab: WebTab,
  state: TopAppBarState,
) {
  LaunchedEffect(tab, state) {
    snapshotFlow {
      Triple(tab.scrollY, tab.screen.copy(fullScreen = false), tab.screenPath)
    }.collect { (scrollY, _, _) ->
      // The bar reports its range once it has been laid out; until then there is
      // nothing to move.
      val limit = state.heightOffsetLimit
      // A finger on the page moves the bar itself, and a page filling the screen has none.
      val isLeftAlone =
        tab.webView?.isTouching == true || tab.screen.fullScreen || tab.isAheadOfScreen
      if (isLeftAlone || limit < -MAX_RANGE_PX) return@collect
      val target = if (scrollY == 0) 0f else limit
      if (state.heightOffset != target) {
        animate(state.heightOffset, target) { value, _ -> state.heightOffset = value }
      }
    }
  }
}

/**
 * Shows the active tab's webview in the container and hides the rest, building a tab's
 * webview the first time it is shown. Hidden rather than removed, so switching never
 * reloads; a webview whose tab is gone is released here, once it is off the screen.
 */
private fun showTab(
  container: FrameLayout,
  model: AppModel,
) {
  val active = model.activeTab
  active?.activate(container.context)
  active?.webView?.let { attach(container, it) }
  val current = model.tabs.mapNotNull { it.webView }
  for (index in container.childCount - 1 downTo 0) {
    val child = container.getChildAt(index)
    if (child !in current) {
      container.removeViewAt(index)
      (child as? WebView)?.destroy()
      continue
    }
    // A failed load puts a message over the webview, which would still take the
    // touches if it were only covered.
    val isShown = child === active?.webView && active.error == null
    child.visibility = if (isShown) android.view.View.VISIBLE else android.view.View.GONE
  }
}

/** The top bar: the title, back, and whatever the page offered beside them. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TopBar(
  model: AppModel,
  tab: WebTab?,
  behavior: TopAppBarScrollBehavior,
  isLandscape: Boolean,
) {
  val screen = tab?.screen
  // Nothing until the page has named itself, because a section's start screen may call
  // itself something other than its tab, and only the page knows what.
  // A new title cross-fades rather than cutting, as the page beneath it slides. The
  // large bar draws a large and a small title and shows one, and a new screen may open or
  // close it, so only the one showing as the title changes fades. The other takes the
  // new title at once, rather than appearing with the old one as the bar moves.
  val title = @Composable {
    val isLarge =
      LocalTextStyle.current.fontSize == MaterialTheme.typography.headlineMedium.fontSize
    AnimatedContent(
      targetState = screen?.title.orEmpty(),
      transitionSpec = {
        val isCollapsed = behavior.state.collapsedFraction > HALF
        val isShowing = isLandscape || isLarge != isCollapsed
        if (isShowing) {
          fadeIn(tween(TITLE_MILLIS)) togetherWith fadeOut(tween(TITLE_MILLIS))
        } else {
          // Snapped, and without the size change, which would otherwise hold the old
          // title beside the new one until it had sprung to its new width.
          fadeIn(snap()) togetherWith fadeOut(snap()) using null
        }
      },
      label = "title",
    ) { text -> BarTitle(text, isLarge = isLarge) }
  }
  // Back fades with the title, as one change to the bar.
  val navigation = @Composable {
    BarFade(isShown = screen?.canGoBack == true) {
      IconButton(onClick = { tab?.goBack() }, modifier = Modifier.testTag("shell.back")) {
        Icon(
          Icons.AutoMirrored.Filled.ArrowBack,
          contentDescription = stringResource(R.string.shell_back),
        )
      }
    }
  }
  val actions: @Composable RowScope.() -> Unit = {
    if (tab != null) BarActions(tab = tab, profile = model.profile)
  }
  // The bar is the page's own paper, scrolled or not, so it reads as part of the page.
  val colors =
    TopAppBarDefaults.topAppBarColors(
      containerColor = Palette.paper,
      scrolledContainerColor = Palette.paper,
      titleContentColor = MaterialTheme.colorScheme.onSurface,
      navigationIconContentColor = MaterialTheme.colorScheme.onSurface,
      actionIconContentColor = MaterialTheme.colorScheme.onSurface,
    )

  if (isLandscape) {
    TopAppBar(
      title,
      navigationIcon = navigation,
      actions = actions,
      windowInsets = chromeInsets.only(WindowInsetsSides.Top + WindowInsetsSides.Horizontal),
      colors = colors,
      scrollBehavior = behavior,
    )
  } else {
    LargeTopAppBar(
      title,
      navigationIcon = navigation,
      actions = actions,
      windowInsets = chromeInsets.only(WindowInsetsSides.Top + WindowInsetsSides.Horizontal),
      colors = colors,
      scrollBehavior = behavior,
    )
  }
}

/** Fades a bar's control in and out with the title, rather than cutting it. */
@Composable
private fun BarFade(
  isShown: Boolean,
  content: @Composable () -> Unit,
) {
  AnimatedVisibility(
    visible = isShown,
    enter = fadeIn(tween(TITLE_MILLIS)),
    exit = fadeOut(tween(TITLE_MILLIS)),
  ) { content() }
}

/**
 * One title in the bar, which the bar draws twice, once in each style, and only the style
 * tells which. The large title shrinks a long name to fit its line rather than
 * cut it, down to a size that still reads as a title; the collapsed one is cut.
 */
@Composable
private fun BarTitle(
  text: String,
  isLarge: Boolean,
) {
  val style = LocalTextStyle.current
  Text(
    text = text,
    // The large title's row runs to the screen's edge, so it keeps the margin it starts at.
    modifier = if (isLarge) Modifier.padding(end = LARGE_TITLE_END) else Modifier,
    maxLines = 1,
    overflow = TextOverflow.Ellipsis,
    autoSize =
      if (isLarge) {
        TextAutoSize.StepBased(minFontSize = SMALLEST_LARGE_TITLE, maxFontSize = style.fontSize)
      } else {
        null
      },
  )
}

/**
 * The overflow menu and the avatar. The page's primary action is the floating button
 * instead, as Material places it.
 */
@Composable
private fun BarActions(
  tab: WebTab,
  profile: Profile?,
) {
  BarFade(isShown = tab.screen.menu.isNotEmpty()) { OverflowMenu(tab = tab) }

  // No avatar before the page has reported, because what it sends reaches only a page
  // that has drawn, and none on the profile itself, where it would lead nowhere. Read
  // from where the page was when it reported, so the avatar comes and goes with the
  // title rather than with the address, which changes before the page has.
  val isShown = profile != null && tab.hasReported && tab.screenPath != profile.path
  BarFade(isShown = isShown) {
    if (profile != null) Avatar(profile = profile, onClick = { tab.open(profile.path) })
  }
}

/**
 * The avatar: the signed-in person's picture, or their initials in a filled circle,
 * opening the profile.
 */
@Composable
private fun Avatar(
  profile: Profile,
  onClick: () -> Unit,
) {
  val name = stringResource(R.string.shell_profile)
  val picture =
    remember(profile.avatar) {
      profile.avatarBytes?.let { BitmapFactory.decodeByteArray(it, 0, it.size)?.asImageBitmap() }
    }
  Box(
    modifier =
      Modifier
        .padding(horizontal = 8.dp)
        .size(34.dp)
        .clip(CircleShape)
        // The picture is round on its own, so nothing is painted behind it.
        .background(if (picture == null) MaterialTheme.colorScheme.primary else Color.Transparent)
        .clickable(onClick = onClick)
        .testTag("shell.profile")
        // The avatar pictures a person rather than names the control, so it has its own.
        .semantics { contentDescription = name },
    contentAlignment = Alignment.Center,
  ) {
    if (picture != null) {
      Image(picture, contentDescription = null, modifier = Modifier.fillMaxSize())
    } else {
      Text(
        profile.initials,
        color = MaterialTheme.colorScheme.onPrimary,
        style = MaterialTheme.typography.labelLarge,
      )
    }
  }
}

/**
 * The page's primary action, as an extended floating button carrying its label, or
 * nothing on a page that offers none, fading with the title as the page changes. It
 * folds to its icon while the page scrolls down, out of the reader's way, and unfolds as
 * it scrolls back up or reaches its top.
 */
@Composable
private fun PrimaryAction(tab: WebTab) {
  // A tab returned to where it was left scrolled keeps the button out of the way.
  var isExpanded by remember(tab) { mutableStateOf(tab.scrollY <= 0) }
  LaunchedEffect(tab) {
    var last = tab.scrollY
    snapshotFlow { tab.scrollY }.collect { scrollY ->
      if (scrollY != last) isExpanded = scrollY < last || scrollY <= 0
      last = scrollY
    }
  }
  AnimatedContent(
    targetState = tab.screen.actions.firstOrNull(),
    transitionSpec = {
      fadeIn(tween(TITLE_MILLIS)) togetherWith fadeOut(tween(TITLE_MILLIS)) using
        SizeTransform(clip = false)
    },
    // Anchored where the floating button sits, so one growing in grows away from the edge.
    contentAlignment = Alignment.BottomEnd,
    contentKey = { it?.id },
    label = "action",
  ) { action ->
    if (action != null) {
      ExtendedFloatingActionButton(
        onClick = { tab.perform(action.id) },
        icon = { action.icon?.let { Icon(Section.icon(it), contentDescription = null) } },
        text = { Text(action.label) },
        // An action without an icon would fold to nothing.
        expanded = isExpanded || action.icon == null,
        containerColor = MaterialTheme.colorScheme.primary,
        contentColor = MaterialTheme.colorScheme.onPrimary,
        modifier = Modifier.testTag("shell.action.${action.id}"),
      )
    }
  }
}

/** The overflow menu, with a divider between the groups the page reported. */
@Composable
private fun OverflowMenu(tab: WebTab) {
  var isOpen by remember { mutableStateOf(false) }
  Box {
    IconButton(onClick = { isOpen = true }, modifier = Modifier.testTag("shell.more")) {
      Icon(Icons.Filled.MoreVert, contentDescription = stringResource(R.string.shell_more))
    }
    DropdownMenu(expanded = isOpen, onDismissRequest = { isOpen = false }) {
      tab.screen.menu.forEachIndexed { index, group ->
        if (index > 0) HorizontalDivider()
        group.forEach { item ->
          MenuItem(item) {
            isOpen = false
            tab.perform(item.id)
          }
        }
      }
    }
  }
}

@Composable
private fun MenuItem(
  item: ScreenItem,
  onClick: () -> Unit,
) {
  DropdownMenuItem(
    text = {
      Column {
        Text(item.label)
        item.unavailable?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
      }
    },
    leadingIcon =
      item.icon?.let { name ->
        { Icon(Section.icon(name), contentDescription = null) }
      },
    enabled = item.unavailable == null,
    onClick = onClick,
  )
}

/**
 * Selecting the tab already showing is the platform's gesture for "back to this tab's top",
 * which the tab decides how to answer.
 */
private fun select(
  model: AppModel,
  section: Section,
) {
  if (section.id == model.activeSectionId) {
    model.activeTab?.reselect()
  } else {
    model.activeSectionId = section.id
  }
}

/** The tab bar: one item per section the session reported. */
@Composable
private fun TabBar(model: AppModel) {
  NavigationBar(
    containerColor = Color.White,
    windowInsets = chromeInsets.only(WindowInsetsSides.Bottom + WindowInsetsSides.Horizontal),
  ) {
    model.sections.forEach { section ->
      NavigationBarItem(
        selected = section.id == model.activeSectionId,
        onClick = { select(model, section) },
        icon = { Icon(Section.icon(section.icon), contentDescription = null) },
        label = { Text(section.label) },
      )
    }
  }
}

/** The tab rail, for landscape: the same sections, down the start side. */
@Composable
private fun TabRail(model: AppModel) {
  NavigationRail(
    containerColor = Color.White,
    windowInsets = chromeInsets.only(WindowInsetsSides.Start + WindowInsetsSides.Vertical),
  ) {
    Spacer(Modifier.weight(1f))
    model.sections.forEach { section ->
      NavigationRailItem(
        selected = section.id == model.activeSectionId,
        onClick = { select(model, section) },
        icon = { Icon(Section.icon(section.icon), contentDescription = null) },
        label = { Text(section.label) },
      )
    }
    Spacer(Modifier.weight(1f))
  }
}

/** Past this much of its collapse, the large bar shows its small title instead. */
private const val HALF = 0.5f

/** Larger than any bar's collapse range, so an unmeasured bar's limit is recognized. */
private const val MAX_RANGE_PX = 100_000f

/** How long the bars take to step aside or come back, and a title to cross-fade. */
private const val BARS_MILLIS = 250
private const val TITLE_MILLIS = 250

/** The smallest the large title shrinks a long name to before cutting it. */
private val SMALLEST_LARGE_TITLE = 22.sp

/** The large title's margin at its end, the one Material gives it at its start. */
private val LARGE_TITLE_END = 16.dp
