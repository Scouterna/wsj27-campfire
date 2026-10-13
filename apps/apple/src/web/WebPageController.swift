import SwiftUI
import UIKit
import WebKit

/// The one view controller on each tab's stack: the webview, edge to edge, with the
/// pages' paper behind it.
///
/// The scroll geometry is left to the system: the webview underlaps the bar, the safe
/// area feeds WebKit's automatic content insets, and the bar's collapse follows the
/// scroll view it is told to read. Managing the insets by hand fights all three parties
/// at once – UIKit collapsing the bar, WebKit anchoring the document, and the page
/// resetting its own scroll.
///
/// WebKit is told what the bars cover, so the page's own scroll position is measured
/// from below the navigation bar, as the reader sees it. Left at its default, WebKit
/// measures from the top of the screen, under the bar, and a view transition captures
/// the leaving page a whole bar's height away from where it was – the row a tap lit
/// slides away from under the finger and another sits there.
///
/// One seam remains: the page's top is below whichever bar is showing, so a page
/// scrolled to its top under a collapsed title rests with the title collapsed, until
/// settling at the top opens it again.
final class WebPageController: UIViewController {
  /// The tab's webview, once it is on screen here.
  private(set) weak var attached: WKWebView?
  private var offsetObservation: NSKeyValueObservation?

  /// The tab whose webview this hosts, asked by the back gesture whether there is a
  /// layer to pop. Not `tab`, which UIKit already claims for its own `UITab`.
  private(set) weak var webTab: WebTab?

  /// The scroll view's top inset with the large title expanded, per width, captured
  /// whenever a layout ends at a settled top. Per width, because a landscape bar has no
  /// large title and an inset of its own, and one remembered across a rotation would
  /// settle the page a whole title too low.
  private var expandedTops: [Int: CGFloat] = [:]

  /// The scroll view's top inset with the large title collapsed, per width, for the same
  /// reason.
  private var collapsedTops: [Int: CGFloat] = [:]

  /// The back swipe, created once so the webview's own scrolling yields to it at the
  /// screen's edge.
  private var backSwipe: BackSwipe?

  /// Whether a back's picture of the leaving screen covers the page, so what changes
  /// beneath it is not seen until the picture slides away.
  var isCovered: Bool {
    backSwipe?.isCovering == true
  }

  /// Whether the page fills the screen, with both bars gone and nothing inset.
  var fillsScreen = false

  /// Where the scroll view rested before the page filled the screen, until the bars are
  /// back over it.
  var fullScreenOffset: CGPoint?

  /// Moves the document under what fills the screen, and back.
  let offsetGlide = OffsetGlide()

  /// Whether a check for a scroll that came to rest is queued, so a gesture queues one at
  /// a time rather than one per frame.
  private var isSettlePending = false

  /// Whether a check for a scroll the page made is queued.
  private var isPlacedSettlePending = false

  /// What the page reported for the bar, and what the bar shows.
  var bars = Bars()

  /// The placeholder and the failure message, hosted as a child so they get the bars'
  /// safe area and start below the navigation bar rather than under it.
  private var overlay: UIHostingController<TabOverlay>?

  override func viewDidLoad() {
    super.viewDidLoad()
    navigationItem.largeTitleDisplayMode = .always
    view.backgroundColor = UIColor(Palette.paper)

    // The swipe begins only where there is a layer to pop, and never while the page
    // fills the screen, where an edge drag belongs to what fills it.
    backSwipe = BackSwipe(
      host: view,
      stage: { [weak self] in self?.navigationController?.view },
      webView: { [weak self] in self?.attached },
      canBegin: { [weak self] in
        self?.webTab?.screen.canGoBack == true && self?.fillsScreen == false
      },
      onBegin: { [weak self] in self?.swipeDidBegin() },
      onEnd: { [weak self] commits in self?.swipeDidEnd(commits: commits) },
    )

    registerForTraitChanges(
      [UITraitPreferredContentSizeCategory.self],
      action: #selector(fitLargeTitle),
    )
  }

  /// The page as it was last on screen, put back over the webview while it draws again.
  /// WebKit draws nothing while its tab is away and shows an empty page for the first
  /// frames back, so the picture holds the tab's last look until the page has drawn.
  private var lastDrawn: UIView?

  override func viewWillDisappear(_ animated: Bool) {
    super.viewWillDisappear(animated)
    lastDrawn = attached?.snapshotView(afterScreenUpdates: false)
  }

  override func viewWillAppear(_ animated: Bool) {
    super.viewWillAppear(animated)
    guard let picture = lastDrawn, let webView = attached else { return }
    lastDrawn = nil
    picture.frame = webView.frame
    picture.isUserInteractionEnabled = false
    view.insertSubview(picture, aboveSubview: webView)
    // Two of the page's frames, so the first has been drawn and handed to the screen by
    // the time the picture goes. A page that cannot answer lets it go at once.
    webView.callAsyncJavaScript(
      "await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)))",
      arguments: [:],
      in: nil,
      in: .defaultClient,
    ) { _ in
      picture.removeFromSuperview()
    }
  }

  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()
    syncObscuredInsets()
    fitLargeTitle()
    guard let scroll = attached?.scrollView, !areBarsAway else { return }
    guard !scroll.isDragging, !scroll.isDecelerating else { return }
    if abs(scroll.contentOffset.y + scroll.adjustedContentInset.top) < 0.5 {
      let key = widthKey
      expandedTops[key] = max(expandedTops[key] ?? 0, scroll.adjustedContentInset.top)
    }
  }

  override func viewWillTransition(
    to size: CGSize,
    with coordinator: any UIViewControllerTransitionCoordinator,
  ) {
    // A page resting at its top before a rotation rests at its top after it, whatever
    // the new bar's height – UIKit would otherwise keep the offset and leave it under the
    // bar or a gap above it.
    let wasAtTop = isAtLogicalTop
    super.viewWillTransition(to: size, with: coordinator)
    coordinator.animate(alongsideTransition: nil) { [weak self] _ in
      guard let self, wasAtTop, let scroll = attached?.scrollView else { return }
      scroll.setContentOffset(
        CGPoint(x: scroll.contentOffset.x, y: -scroll.adjustedContentInset.top),
        animated: false,
      )
    }
  }

  private var widthKey: Int {
    Int(view.bounds.width.rounded())
  }

  private var expandedTop: CGFloat {
    expandedTops[widthKey] ?? 0
  }

  /// Whether the page rests at its visual top, under the expanded large title.
  var isAtLogicalTop: Bool {
    guard let scroll = attached?.scrollView else { return true }
    let top = max(expandedTop, scroll.adjustedContentInset.top)
    return scroll.contentOffset.y <= -top + 1
  }

  /// Scroll to the visual top, animated. The target is the current inset, not the
  /// expanded one: as the scroll nears it, UIKit expands the large title and shifts the
  /// offset by the growth itself, so aiming at the expanded top would apply it twice.
  func scrollToLogicalTop() {
    guard let scroll = attached?.scrollView else { return }
    let top = scroll.adjustedContentInset.top
    scroll.setContentOffset(CGPoint(x: scroll.contentOffset.x, y: -top), animated: true)
  }

  /// Pop as a released back swipe does, for the back button: the screen as it is slides
  /// away over the page beneath, which the web pops unanimated.
  ///
  /// - Returns: Whether the screen slid, which it does not where a swipe could not begin.
  func slideBack() -> Bool {
    backSwipe?.pop { [weak self] slide in self?.awaitPoppedPage(slide) } == true
  }

  /// What starts a back's slide, waiting for the popped page to report.
  private var poppedPageWait: (() -> Void)?

  /// Calls back once the popped page has reported and drawn twice since, by when its
  /// restored scroll position is on screen, or once a limit has passed, so a page that
  /// never reports is not waited for.
  private func awaitPoppedPage(_ ready: @escaping () -> Void) {
    var hasRun = false
    let once = {
      guard !hasRun else { return }
      hasRun = true
      ready()
    }
    poppedPageWait = once
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { [weak self] in
      self?.poppedPageWait = nil
      once()
    }
  }

  /// The page reported its screen. A back waiting to slide starts once the page has
  /// drawn what it reported.
  func screenDidReport() {
    guard let wait = poppedPageWait, let webView = attached else { return }
    poppedPageWait = nil
    webView.callAsyncJavaScript(
      "await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)))",
      arguments: [:],
      in: nil,
      in: .defaultClient,
    ) { _ in
      wait()
    }
  }

  /// Show the tab's placeholder or failure over the webview, or take it away.
  func setOverlay(isShown: Bool) {
    guard let webTab else { return }
    if isShown, overlay == nil {
      let hosting = UIHostingController(rootView: TabOverlay(tab: webTab))
      hosting.view.backgroundColor = .clear
      addChild(hosting)
      hosting.view.frame = view.bounds
      hosting.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
      view.addSubview(hosting.view)
      hosting.didMove(toParent: self)
      overlay = hosting
    } else if !isShown, let hosting = overlay {
      overlay = nil
      UIView.animate(withDuration: 0.3) {
        hosting.view.alpha = 0
      } completion: { _ in
        hosting.willMove(toParent: nil)
        hosting.view.removeFromSuperview()
        hosting.removeFromParent()
      }
    }
  }

  /// Put the tab's webview on screen once it exists.
  func attach(tab: WebTab) {
    webTab = tab
    guard let webView = tab.webView, webView !== attached else { return }
    loadViewIfNeeded()
    attached?.removeFromSuperview()
    webView.frame = view.bounds
    webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    webView.scrollView.contentInsetAdjustmentBehavior = .automatic
    view.insertSubview(webView, at: 0)
    attached = webView
    // At the screen's edge the back swipe wins; everywhere else, and wherever there is
    // nothing to pop, it fails at once and scrolling is untouched, as a navigation
    // controller's own pop gesture asks of its content.
    if let backSwipe {
      webView.scrollView.panGestureRecognizer.require(toFail: backSwipe.gesture)
    }
    // The bar reads this scroll view for the large title, explicitly rather than by
    // guessing from the subviews.
    setContentScrollView(webView.scrollView, for: .top)
    offsetObservation = webView.scrollView.observe(\.contentOffset) { [weak self] scroll, _ in
      MainActor.assumeIsolated {
        self?.offsetDidChange(scroll)
      }
    }
  }

  /// Tells WebKit how much of the webview the navigation bar covers, so its layout
  /// viewport – where the page's own scroll position, a view transition's capture, and
  /// fixed elements are measured from – starts below the bar rather than under it. The
  /// bar's inset changes as the large title collapses, so this follows every scroll.
  /// The tab bar is left out: it floats over the page as glass, and a viewport ending
  /// above it would leave what shows through it out of a view transition's capture.
  /// While the bars are away nothing covers the page, and its fixed elements reach the
  /// edges – once the document's top has scrolled up to the screen's. Until then the part
  /// above the document counts as covered, so the viewport grows with every step of the
  /// scroll and the page, which waits for it to stop changing, measures nothing before the
  /// document is still.
  func syncObscuredInsets() {
    guard let webView = attached else { return }
    let scroll = webView.scrollView
    let top = if areBarsAway {
      max(0, -scroll.contentOffset.y)
    } else {
      scroll.adjustedContentInset.top
    }
    let obscured = UIEdgeInsets(top: top, left: 0, bottom: 0, right: 0)
    if webView.obscuredContentInsets != obscured {
      webView.obscuredContentInsets = obscured
    }
  }

  /// Whether the bars are away and the insets frozen – while the page fills the screen,
  /// and until the bars are back after it.
  private var areBarsAway: Bool {
    fillsScreen || attached?.scrollView.contentInsetAdjustmentBehavior == .never
  }

  private func offsetDidChange(_ scroll: UIScrollView) {
    syncObscuredInsets()
    if areBarsAway {
      return
    }
    let key = widthKey
    collapsedTops[key] = min(collapsedTops[key] ?? .infinity, scroll.adjustedContentInset.top)
    guard scroll.isDragging || scroll.isDecelerating else {
      // A scroll the page made settles a moment later rather than at once: a push scrolls
      // the new screen to its top a frame or two before it names itself, and opening the
      // large title then would show the leaving screen's name in it. The bar also lays
      // itself out after the scroll, so the inset read then is the one it settled at.
      if !isPlacedSettlePending {
        isPlacedSettlePending = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
          guard let self else { return }
          isPlacedSettlePending = false
          if !scroll.isDragging, !scroll.isDecelerating, !areBarsAway {
            settleAtLogicalTop(scroll)
            settleLargeTitle(scroll)
          }
        }
      }
      return
    }
    // A gesture's last movement arrives while the scroll view still counts itself
    // moving, so whether it came to rest at the collapsed top – as a page shorter than
    // the screen does once it springs back – is asked once the movement has ended.
    if !isSettlePending {
      isSettlePending = true
      DispatchQueue.main.async { [weak self] in
        guard let self else { return }
        isSettlePending = false
        if !scroll.isDragging, !scroll.isDecelerating, !areBarsAway {
          settleAtLogicalTop(scroll)
        }
      }
    }
  }

  /// Every push scrolls the new screen to the top with `scrollTo(0, 0)`, which lands
  /// exactly at the top below the bar showing – the collapsed one when the leaving page
  /// was scrolled. A screen that starts at its top starts with its large title open, so
  /// a page resting exactly there is moved to the expanded top, the title growing as a
  /// list's does when it is pulled to its top. A gesture gets here only once it has come
  /// to rest, so a page shorter than the screen springs back to its large title as a
  /// short list does.
  private func settleAtLogicalTop(_ scroll: UIScrollView) {
    let top = scroll.adjustedContentInset.top
    let expanded = max(expandedTop, top)
    let isAtCollapsedTop = abs(scroll.contentOffset.y + top) < 0.5
    guard isAtCollapsedTop, expanded > top + 0.5 else { return }
    // The bar computes its height from the offset, so landing at the expanded top is
    // also what reopens the collapsed large title.
    UIView.animate(
      withDuration: 0.3,
      delay: 0,
      options: [.curveEaseOut, .beginFromCurrentState, .allowUserInteraction],
    ) {
      scroll.contentOffset = CGPoint(x: scroll.contentOffset.x, y: -expanded)
      self.navigationController?.navigationBar.layoutIfNeeded()
    }
  }

  /// A scroll the page made can come to rest with the large title partly scrolled under
  /// the bar, which a drag never leaves it in: the bar then reaches over the top of the
  /// page and takes the taps meant for it. The title goes the rest of the way, open or
  /// closed, whichever is nearer, as it does when a drag lets go there.
  private func settleLargeTitle(_ scroll: UIScrollView) {
    let key = widthKey
    guard let expanded = expandedTops[key], let collapsed = collapsedTops[key] else { return }
    let band = expanded - collapsed
    let into = scroll.contentOffset.y + expanded
    guard band > 0.5, into > 0.5, into < band - 0.5 else { return }
    let target = into < band / 2 ? -expanded : -collapsed
    UIView.animate(
      withDuration: 0.3,
      delay: 0,
      options: [.curveEaseOut, .beginFromCurrentState, .allowUserInteraction],
    ) {
      scroll.contentOffset = CGPoint(x: scroll.contentOffset.x, y: target)
      self.navigationController?.navigationBar.layoutIfNeeded()
    }
  }
}
