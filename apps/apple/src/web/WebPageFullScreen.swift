import UIKit
import WebKit

/// What fills the screen, as the page reports it.
///
/// WebKit places what is fixed to the viewport no higher than the document's top, so
/// filling the screen from a page resting below the bars means scrolling the document up
/// first. The page waits for the viewport to stop changing before it measures where to
/// grow from, so the document moves before anything grows, and what grows starts from
/// where the reader sees its place.
///
/// Returning, the page has already shrunk what filled the screen back into its place, with
/// the bars still away and the document where filling the screen moved it. The document
/// goes back to where it rested, and the bars come back over it once it is there, in the
/// state they left in.
extension WebPageController {
  /// Fill the screen, or stop.
  func fillScreen(_ fills: Bool) {
    guard fills != fillsScreen, let navigation = navigationController else { return }
    fillsScreen = fills
    guard let scroll = attached?.scrollView else {
      fadeNavigationBar(out: fills, of: navigation)
      hideTabBar(fills, of: navigation)
      return
    }
    if fills {
      enterFullScreen(scroll, in: navigation)
    } else {
      leaveFullScreen(scroll, in: navigation)
    }
  }

  private func enterFullScreen(_ scroll: UIScrollView, in navigation: UINavigationController) {
    // Frozen while the bars are gone, because the system keeps the distance from the top
    // when the safe area changes and would move the document by the bars' height in one
    // frame. Still frozen when the page fills the screen again before the bars are back.
    scroll.contentInset = scroll.adjustedContentInset
    scroll.contentInsetAdjustmentBehavior = .never
    fadeNavigationBar(out: true, of: navigation)
    hideTabBar(true, of: navigation)
    showEdgeEffects(false, of: scroll)
    syncObscuredInsets()
    let offset = scroll.contentOffset
    let before = fullScreenOffset ?? offset
    fullScreenOffset = before
    let held = CGPoint(x: offset.x, y: max(offset.y, 0))
    offsetGlide.move(scroll, to: held, duration: UINavigationController.hideShowBarDuration)
  }

  /// The document goes back the way it came, with nothing over it, so nothing in it moves
  /// against anything else, and the bars come back only once it rests where they left it.
  private func leaveFullScreen(_ scroll: UIScrollView, in navigation: UINavigationController) {
    let before = fullScreenOffset ?? scroll.contentOffset
    let duration = UINavigationController.hideShowBarDuration
    offsetGlide.move(scroll, to: before, duration: duration) { [weak self] in
      self?.bringBarsBack(scroll, in: navigation)
    }
  }

  /// Hands the insets back to the system and shows the bars, over a document already where
  /// it rested before the page filled the screen.
  private func bringBarsBack(_ scroll: UIScrollView, in navigation: UINavigationController) {
    guard !fillsScreen else { return }
    fullScreenOffset = nil
    let offset = scroll.contentOffset
    fadeNavigationBar(out: false, of: navigation)
    hideTabBar(false, of: navigation)
    scroll.contentInset = .zero
    scroll.contentInsetAdjustmentBehavior = .automatic
    navigation.view.layoutIfNeeded()
    // The large title opens or closes for the offset it is given, and moves the offset by
    // its own height as it does, so the offset is set until it stays.
    for _ in 0 ..< 3 where scroll.contentOffset != offset {
      scroll.contentOffset = offset
      navigation.view.layoutIfNeeded()
    }
    syncObscuredInsets()
    showEdgeEffects(true, of: scroll)
  }

  /// The glass the bars draw over the page's edges, which would otherwise stay behind
  /// them over what fills the screen.
  private func showEdgeEffects(_ isShown: Bool, of scroll: UIScrollView) {
    scroll.topEdgeEffect.isHidden = !isShown
    scroll.bottomEdgeEffect.isHidden = !isShown
  }

  /// Hides the tab bar in the same step as the navigation bar. It slides away, and fades
  /// back in as the navigation bar does, because sliding back lays the stack out inside its
  /// animation and carries the large title up from below.
  private func hideTabBar(_ hides: Bool, of navigation: UINavigationController) {
    guard let tabs = navigation.tabBarController else { return }
    guard !hides else {
      tabs.setTabBarHidden(true, animated: true)
      return
    }
    UIView.performWithoutAnimation {
      tabs.setTabBarHidden(false, animated: false)
      tabs.view.layoutIfNeeded()
    }
    tabs.tabBar.alpha = 0
    UIView.animate(withDuration: UINavigationController.hideShowBarDuration) {
      tabs.tabBar.alpha = 1
    }
  }

  /// The bar fades rather than slides, as a full-screen viewer's does. It leaves the layout
  /// at once and a picture of it fades out in its place, so the safe area the page lays
  /// what fills the screen out against is final before the page measures it.
  private func fadeNavigationBar(out isLeaving: Bool, of navigation: UINavigationController) {
    let bar = navigation.navigationBar
    let duration = UINavigationController.hideShowBarDuration
    guard isLeaving else {
      guard bar.isHidden else { return }
      bar.isHidden = false
      // On the layer, because UIKit sets the bar's own alpha back as it lays it out.
      let fade = CABasicAnimation(keyPath: "opacity")
      fade.fromValue = 0
      fade.toValue = 1
      fade.duration = duration
      fade.fillMode = .backwards
      bar.layer.add(fade, forKey: "fullScreen")
      return
    }
    guard !bar.isHidden else { return }
    // The bar's own row and what is above it. The large title scrolls with the page, so it
    // leaves with the document rather than fading where it was.
    let row = bar.subviews.first { String(describing: type(of: $0)).contains("ContentView") }
    let height = bar.frame.minY + (row?.frame.height ?? bar.frame.height)
    let region = CGRect(x: 0, y: 0, width: bar.frame.width, height: height)
    if let picture = navigation.view.resizableSnapshotView(
      from: region,
      afterScreenUpdates: false,
      withCapInsets: .zero,
    ) {
      picture.frame = region
      picture.isUserInteractionEnabled = false
      navigation.view.addSubview(picture)
      UIView.animate(withDuration: duration) {
        picture.alpha = 0
      } completion: { _ in
        picture.removeFromSuperview()
      }
    }
    bar.isHidden = true
  }
}

/// Moves a scroll view's offset frame by frame rather than by a view animation, which
/// would tell WebKit only where it ends. Each step is a scroll WebKit hears, and a change
/// to the viewport the page waits out.
@MainActor
final class OffsetGlide: NSObject {
  private var link: CADisplayLink?
  private weak var scroll: UIScrollView?
  private var from = CGPoint.zero
  private var target = CGPoint.zero
  private var start: CFTimeInterval = 0
  private var duration: CFTimeInterval = 0
  private var onEnd: (() -> Void)?

  /// Whether a move is under way.
  var isMoving: Bool {
    link != nil
  }

  /// Ease the offset to a target, replacing any move under way, whose end then never
  /// comes. A drag stops it where it is, and that is its end.
  ///
  /// - Parameters:
  ///   - scroll: the scroll view to move
  ///   - target: the offset to end at
  ///   - duration: how long the move takes, in seconds
  ///   - onEnd: what follows once the move has ended, at once when there is nowhere to go
  func move(
    _ scroll: UIScrollView,
    to target: CGPoint,
    duration: TimeInterval,
    onEnd: (() -> Void)? = nil,
  ) {
    stop()
    guard scroll.contentOffset != target else {
      onEnd?()
      return
    }
    self.onEnd = onEnd
    self.scroll = scroll
    from = scroll.contentOffset
    self.target = target
    self.duration = duration
    start = CACurrentMediaTime()
    let link = CADisplayLink(target: self, selector: #selector(step))
    link.add(to: .main, forMode: .common)
    self.link = link
  }

  /// Stop where the offset is now, without the move's end.
  func stop() {
    link?.invalidate()
    link = nil
    onEnd = nil
  }

  private func end() {
    let onEnd = onEnd
    stop()
    onEnd?()
  }

  @objc private func step(_ link: CADisplayLink) {
    guard let scroll, !scroll.isTracking else {
      end()
      return
    }
    let progress = min(1, (link.targetTimestamp - start) / duration)
    // Ease in and out, as the bars' own show and hide do.
    let eased = progress < 0.5 ? 2 * progress * progress : 1 - pow(2 - 2 * progress, 2) / 2
    scroll.contentOffset = CGPoint(
      x: from.x + (target.x - from.x) * eased,
      y: from.y + (target.y - from.y) * eased,
    )
    if progress >= 1 {
      end()
    }
  }
}
