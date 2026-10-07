package se.scouterna.campfire.web

import android.animation.ValueAnimator
import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color
import android.net.Uri
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.toArgb
import androidx.webkit.JavaScriptReplyProxy
import androidx.webkit.WebMessageCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import se.scouterna.campfire.theme.Palette
import java.net.URI

/**
 * One webview, its own back-forward list, and the last screen its page reported.
 *
 * The webview is built on first activation and never rebuilt, so leaving a tab and
 * returning shows the screen it was left at without a reload. Its history is its own,
 * which is what keeps a back gesture from reaching another tab.
 *
 * Every `WebView` in a process shares one `CookieManager`, so the cookie jar is single by
 * construction and outlives the discarded sign-in webview.
 */
@Stable
internal class WebTab(
  val id: String,
  path: String,
  configuredOrigin: String,
  /**
   * Whether this is the one webview shown while nobody is signed in. It has no bars, owns
   * the whole screen, and never leaves the application's own page: the round trip through
   * the identity provider runs in a sheet over it.
   */
  val isSignIn: Boolean = false,
  private val onMessage: (ToShell) -> Unit,
) {
  // A message listener's origin rule with a trailing slash is refused with a crash, so
  // the origin is normalized once and the address, the rule, and the same-origin test
  // all read the same string.
  private val origin: String = configuredOrigin.trimEnd('/')

  val url: String = origin + path

  var screen by mutableStateOf(Screen.EMPTY)
    private set

  var error by mutableStateOf<String?>(null)
    private set

  /**
   * Whether the page has reported anything yet. The reply channel exists only once the
   * page has spoken, and the placeholder stays up until the page has drawn rather than
   * merely loaded.
   */
  var hasReported by mutableStateOf(false)
    private set

  /**
   * Whether the page has reported its screen, which it does once it has drawn one. A tab's
   * placeholder waits for this rather than for the session, which arrives first.
   */
  var hasScreen by mutableStateOf(false)
    private set

  /**
   * Whether the page has had long enough to report since it started speaking, or to start
   * speaking since it loaded. A placeholder lifts on this as well, so a report that never
   * arrives cannot leave it over a drawn page, while a page still booting keeps it.
   */
  var hasSettled by mutableStateOf(false)
    private set

  /**
   * Whether the sign-in webview's page has said nobody is signed in, so what it draws is
   * the sign-in screen. Until it has, the page may be about to draw the signed-in start
   * screen, which belongs to the tabs, so the launch color stays over it.
   */
  var showsSignIn by mutableStateOf(false)
    private set

  /**
   * Whether the sign-in webview's page waits under the launch color for the session: not
   * failed, and not past the time any page takes.
   */
  val awaitsSession: Boolean
    get() = isSignIn && !showsSignIn && !hasSettled && error == null

  /**
   * Where the round trip through the identity provider began, shown in a sheet over the
   * sign-in webview, or null while none is under way.
   */
  var roundTrip by mutableStateOf<String?>(null)
    private set

  /**
   * The path the webview showed when its page last reported a screen, so what the bar
   * draws for an address changes together with the rest of the bar, not ahead of it.
   */
  var screenPath by mutableStateOf<String?>(null)
    private set

  /**
   * Whether the page has moved to an address it has not reported a screen for yet, which
   * it has between a navigation and the report that follows it. Read from the webview
   * rather than observed, so it is current whenever something else changes.
   */
  val isAheadOfScreen: Boolean
    get() = hasScreen && path() != screenPath

  /**
   * Whether a tab's page has left its document after speaking – signing out does, by a
   * round trip through the auth service – and the new document has drawn no signed-in
   * screen yet. What shows meanwhile is a blank page, and then perhaps the sign-in screen,
   * neither of which belongs under the signed-in chrome.
   */
  var isReplaced by mutableStateOf(false)
    private set

  /**
   * Whether the signed-in chrome is covered while the tab's page is replaced: not once the
   * replacement has failed, or has had longer than any page takes to speak.
   */
  val isLeaving: Boolean
    get() = isReplaced && !hasSettled && error == null

  var webView by mutableStateOf<NestedWebView?>(null)
    private set

  /** How far the page is scrolled, which the top bar's large title follows. */
  var scrollY by mutableIntStateOf(0)
    private set

  private var replyProxy: JavaScriptReplyProxy? = null

  private var glide: ValueAnimator? = null

  // Counts page loads, so a settle timer from a page since replaced does nothing.
  private var loads = 0

  // java.net.URI rather than android.net.Uri, because Uri.parse is a stub on a JVM test's
  // classpath and answers null there.
  private val originUri = URI(origin)

  /** Build the webview and load it, once. Every call after the first does nothing. */
  fun activate(context: Context) {
    if (webView != null) return
    val view = createWebView(context)
    webView = view
    if (error == null) load()
  }

  /** Load, or reload, the tab's own address. */
  fun load() {
    if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) return
    error = null
    webView?.loadUrl(url)
  }

  /**
   * The round trip came back to the sign-in webview's own address, with the session's
   * cookies set in the shared jar on the way. The sheet closes, and the sign-in webview
   * loads the address under its launch color, so the page drawn for the new session is the
   * tabs' rather than this one's.
   *
   * @param address the address the round trip returned to
   */
  fun roundTripDidReturn(address: String) {
    roundTrip = null
    error = null
    webView?.loadUrl(address)
  }

  /**
   * The person closed the sheet before the round trip came back, which leaves the sign-in
   * screen as it was.
   */
  fun roundTripDidEnd() {
    roundTrip = null
  }

  /** Go back one layer, animated by the web. */
  fun goBack() = send(ToWeb.Back)

  /** A bar item was tapped. What it does is the web's business. */
  fun perform(itemId: String) = send(ToWeb.Action(itemId))

  /** Show an origin-relative address the web reported. */
  fun open(path: String) = send(ToWeb.Open(path))

  /**
   * The active tab was selected again – the platform's two-stage gesture. A scrolled page
   * glides to its top; a page already there returns to the tab's first screen.
   */
  fun reselect() {
    val view = webView ?: return
    if (view.scrollY == 0) {
      send(ToWeb.PopToRoot)
      return
    }
    glide?.cancel()
    glide =
      ValueAnimator.ofInt(view.scrollY, 0).apply {
        duration = SCROLL_TO_TOP_MILLIS
        // A finger landing on the page takes it over, as it stops a native glide.
        addUpdateListener {
          if (view.isTouching) cancel() else view.scrollTo(view.scrollX, it.animatedValue as Int)
        }
        start()
      }
  }

  /**
   * Release the webview, whose page would otherwise keep running. The next activation
   * builds a new one.
   */
  fun destroy() {
    val view = webView ?: return
    webView = null
    replyProxy = null
    glide?.cancel()
    view.destroy()
  }

  private fun send(message: ToWeb) {
    val proxy = replyProxy ?: return
    // The proxy only exists because a listener was installed, which needs the feature,
    // but the check belongs where Android Lint can see it.
    if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
      proxy.postMessage(message.json)
    }
  }

  @SuppressLint("SetJavaScriptEnabled")
  private fun createWebView(context: Context): NestedWebView {
    val view = NestedWebView(context)

    view.settings.apply {
      javaScriptEnabled = true
      domStorageEnabled = true
      // A page cannot open a second window, so target="_blank" has nowhere to go.
      setSupportMultipleWindows(false)
      // The token the web reads to learn it is hosted, appended to the default agent so
      // the page still knows which browser it runs in.
      userAgentString =
        WebSettings.getDefaultUserAgent(context) + " CampfireShell/${Bridge.VERSION} (android)"
    }

    // A long press on the app's own content opens nothing, because "open in new window"
    // belongs to a browser, but a field keeps its selection and paste.
    view.setOnLongClickListener {
      view.hitTestResult.type != WebView.HitTestResult.EDIT_TEXT_TYPE
    }
    // The paper paints the page's overscroll and its first frame, so neither flashes white.
    view.setBackgroundColor(if (isSignIn) Color.TRANSPARENT else Palette.paper.toArgb())
    view.onScrollChange = { scrollY = it }
    view.webViewClient = client(context)

    // The rule is derived from the same origin as the address, so the two cannot
    // disagree – a rule matches scheme, host, and port exactly.
    if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
      WebViewCompat.addWebMessageListener(
        view,
        Bridge.CHANNEL_NAME,
        setOf(origin),
      ) { _, message, _, _, proxy ->
        replyProxy = proxy
        receive(message)
      }
    } else {
      // A shell that cannot talk to its page draws no chrome at all, which is a failure.
      error = context.getString(se.scouterna.campfire.R.string.shell_bridgeless)
    }

    return view
  }

  /** Take what the web reported. Internal so a test can report what the bridge would. */
  internal fun receive(message: ToShell) {
    // The sign-in webview's cover waits for the session instead, however long it takes.
    if (!hasReported && !isSignIn) settle(after = REPORT_MILLIS)
    hasReported = true
    // A page that has said nobody is signed in stays covered, because the tabs are about
    // to give way to the sign-in webview.
    if (message is ToShell.ScreenReport || message is ToShell.SignedIn) isReplaced = false
    if (message is ToShell.ScreenReport) {
      screen = message.screen
      screenPath = path()
      hasScreen = true
      error = null
      return
    }
    if (message is ToShell.SignedIn) showsSignIn = false
    if (message == ToShell.SignedOut) showsSignIn = true
    onMessage(message)
  }

  /** The path the webview shows now, or nothing before it has a page. */
  private fun path(): String? = webView?.url?.let { runCatching { URI(it).path }.getOrNull() }

  /**
   * A document started loading. Internal so a test can start one, as the webview would.
   *
   * @param url the document's address
   */
  internal fun started(url: String) {
    loads += 1
    hasSettled = false
    if (!isSignIn) {
      isReplaced = hasReported
      return
    }
    // The sign-in webview's own address is where the page draws whatever the session
    // allows, and speaks only after it has drawn.
    if (isOwnAddress(url)) showsSignIn = false
  }

  /** Marks the page settled after a delay, unless another page has started by then. */
  private fun settle(after: Long) {
    val load = loads
    webView?.postDelayed({ if (load == loads) hasSettled = true }, after)
  }

  private fun receive(message: WebMessageCompat) {
    val json = message.data ?: return
    receive(Bridge.decode(json) ?: return)
  }

  // androidx.webkit's MissingOnRenderProcessGone check reports the WebViewClient()
  // constructor call itself and never looks for the override, which is implemented below.
  @SuppressLint("MissingOnRenderProcessGone")
  private fun client(context: Context): WebViewClient =
    object : WebViewClient() {
      override fun shouldOverrideUrlLoading(
        view: WebView,
        request: WebResourceRequest,
      ): Boolean {
        val target = request.url
        val isWeb = target.scheme == "http" || target.scheme == "https"
        // The sign-in webview stays on its own page, and the round trip through the
        // identity provider that starts from it opens in a sheet instead.
        if (isSignIn && isWeb && startsRoundTrip(request)) {
          roundTrip = target.toString()
          return true
        }
        // A tab follows a redirect wherever it leads, because signing out passes through
        // the identity provider on its way back.
        if (isSameOrigin(target) || (isWeb && request.isRedirect)) return false
        // Anything else off the origin – a mailto:, a tel:, another site – goes to the
        // system, because a tab holds one application.
        try {
          context.startActivity(Intent(Intent.ACTION_VIEW, target))
        } catch (_: ActivityNotFoundException) {
          // Nothing on this device opens it, and refusing to navigate is the answer anyway.
        }
        return true
      }

      override fun onPageStarted(
        view: WebView,
        url: String,
        favicon: Bitmap?,
      ) = started(url)

      override fun onPageFinished(
        view: WebView,
        url: String,
      ) {
        settle(after = LOAD_MILLIS)
      }

      override fun onReceivedError(
        view: WebView,
        request: WebResourceRequest,
        error: WebResourceError,
      ) {
        if (request.isForMainFrame) this@WebTab.error = error.description.toString()
      }

      // The system ends a page's renderer for memory whenever it likes, and the tab
      // reports the loss the way a failed load does. Returning true keeps the app alive.
      override fun onRenderProcessGone(
        view: WebView,
        detail: RenderProcessGoneDetail,
      ): Boolean {
        destroy()
        this@WebTab.error = context.getString(se.scouterna.campfire.R.string.shell_gone)
        return true
      }
    }

  /** Whether a navigation leaves the sign-in webview's own page for another document. */
  private fun startsRoundTrip(request: WebResourceRequest): Boolean =
    request.isForMainFrame && !isOwnAddress(request.url.toString())

  /** Whether an address is the tab's own, whatever its query or fragment. */
  internal fun isOwnAddress(candidate: String): Boolean {
    val other = runCatching { URI(candidate) }.getOrNull() ?: return false
    val own = URI(url)
    return other.scheme == own.scheme &&
      other.host == own.host &&
      other.port == own.port &&
      other.path.ifEmpty { "/" } == own.path.ifEmpty { "/" }
  }

  private fun isSameOrigin(candidate: Uri): Boolean =
    candidate.scheme == originUri.scheme &&
      candidate.host == originUri.host &&
      candidate.port == originUri.port

  private companion object {
    const val SCROLL_TO_TOP_MILLIS = 300L

    /** Longer than any page takes from its first report to reporting its screen. */
    const val REPORT_MILLIS = 2_500L

    /**
     * Longer than any page takes from loading to its first report, the development
     * server's unbundled modules included.
     */
    const val LOAD_MILLIS = 10_000L
  }
}
