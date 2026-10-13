package se.scouterna.campfire.web

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import kotlinx.coroutines.launch
import se.scouterna.campfire.R
import java.net.URI

/**
 * The round trip through the identity provider, in a sheet over the sign-in screen. It has
 * a webview of its own, and every webview in the process shares one cookie jar, so the
 * session the auth service sets on the way back lands where the tabs read it. It closes
 * once the round trip is back at the sign-in webview's own address.
 *
 * @param address where the round trip begins
 * @param isReturn whether an address is the one the round trip comes back to
 * @param onReturn called with the address the round trip came back to, once the sheet has
 *   slid away
 * @param onClose called when the person closes the sheet before the round trip has come
 *   back
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun IdentitySheet(
  address: String,
  isReturn: (String) -> Boolean,
  onReturn: (String) -> Unit,
  onClose: () -> Unit,
) {
  val sheet = rememberModalBottomSheetState(skipPartiallyExpanded = true)
  val scope = rememberCoroutineScope()
  val currentOnReturn by rememberUpdatedState(onReturn)
  var host by remember(address) { mutableStateOf(hostOf(address)) }
  var failure by remember(address) { mutableStateOf<String?>(null) }
  var view by remember(address) { mutableStateOf<WebView?>(null) }

  ModalBottomSheet(
    onDismissRequest = onClose,
    sheetState = sheet,
    containerColor = Color.White,
  ) {
    // Where the person is signing in, as a browser's address bar would say, because the
    // page asking for a password is not the app's own.
    Text(
      host,
      style = MaterialTheme.typography.labelLarge,
      textAlign = TextAlign.Center,
      modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
    )
    Box(modifier = Modifier.fillMaxSize().imePadding()) {
      AndroidView(
        factory = { context ->
          identityWebView(
            context = context,
            isReturn = isReturn,
            onReturn = { returned ->
              // The sheet slides away first, as it does when the person closes it.
              scope.launch { sheet.hide() }.invokeOnCompletion { currentOnReturn(returned) }
            },
            onPage = { url ->
              host = hostOf(url)
              failure = null
            },
            onFailure = { failure = it },
            onGone = onClose,
          ).also {
            view = it
            it.loadUrl(address)
          }
        },
        onRelease = { it.destroy() },
        modifier = Modifier.fillMaxSize(),
      )
      failure?.let { message ->
        Failure(message = message, onRetry = { view?.loadUrl(address) })
      }
    }
  }
}

/**
 * A webview that follows the round trip wherever it leads on the web, and stops it at its
 * return. Its agent carries no shell token, because the identity provider is an ordinary
 * site rather than the hosted application. A renderer the system ends takes the round trip
 * with it, so the sheet closes and the sign-in screen offers it again.
 */
@SuppressLint("SetJavaScriptEnabled")
private fun identityWebView(
  context: Context,
  isReturn: (String) -> Boolean,
  onReturn: (String) -> Unit,
  onPage: (String) -> Unit,
  onFailure: (String) -> Unit,
  onGone: () -> Unit,
): WebView {
  val view = WebView(context)
  view.settings.apply {
    javaScriptEnabled = true
    domStorageEnabled = true
    // A page cannot open a second window, so target="_blank" has nowhere to go.
    setSupportMultipleWindows(false)
  }
  view.webViewClient = identityClient(context, isReturn, onReturn, onPage, onFailure, onGone)
  return view
}

// androidx.webkit's MissingOnRenderProcessGone check reports the WebViewClient()
// constructor call itself and never looks for the override, which is implemented below.
@SuppressLint("MissingOnRenderProcessGone")
private fun identityClient(
  context: Context,
  isReturn: (String) -> Boolean,
  onReturn: (String) -> Unit,
  onPage: (String) -> Unit,
  onFailure: (String) -> Unit,
  onGone: () -> Unit,
): WebViewClient =
  object : WebViewClient() {
    override fun shouldOverrideUrlLoading(
      view: WebView,
      request: WebResourceRequest,
    ): Boolean {
      val target = request.url
      val isWeb = target.scheme == "http" || target.scheme == "https"
      // The return is loaded by the sign-in webview rather than here, so the page drawn
      // for the new session is drawn where the shell can hand it on.
      if (isWeb && request.isForMainFrame && isReturn(target.toString())) {
        onReturn(target.toString())
        return true
      }
      if (isWeb) return false
      try {
        context.startActivity(Intent(Intent.ACTION_VIEW, target))
      } catch (_: ActivityNotFoundException) {
        // Nothing on this device opens it, and refusing to navigate is the answer anyway.
      }
      return true
    }

    override fun onPageCommitVisible(
      view: WebView,
      url: String,
    ) = onPage(url)

    override fun onReceivedError(
      view: WebView,
      request: WebResourceRequest,
      error: WebResourceError,
    ) {
      if (request.isForMainFrame) onFailure(error.description.toString())
    }

    // Returning true keeps the app alive; the webview is released with the sheet.
    override fun onRenderProcessGone(
      view: WebView,
      detail: RenderProcessGoneDetail,
    ): Boolean {
      onGone()
      return true
    }
  }

@Composable
private fun Failure(
  message: String,
  onRetry: () -> Unit,
) {
  Box(
    modifier = Modifier.fillMaxSize().background(Color.White),
    contentAlignment = Alignment.Center,
  ) {
    Column(
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalArrangement = Arrangement.spacedBy(8.dp),
      modifier = Modifier.padding(24.dp),
    ) {
      Text(
        stringResource(R.string.shell_identity_unreachable),
        style = MaterialTheme.typography.titleLarge,
      )
      Text(message, style = MaterialTheme.typography.bodyMedium, textAlign = TextAlign.Center)
      Button(onClick = onRetry) { Text(stringResource(R.string.shell_unreachable_retry)) }
    }
  }
}

/** The host of an address, or the address itself where it has none. */
private fun hostOf(address: String): String =
  runCatching { URI(address).host }.getOrNull() ?: address
