import UIKit
import WebKit

/// The back swipe from a screen's leading edge, drawn by hand because the web owns the
/// history and nothing is ever pushed onto the native stack.
///
/// As the finger lands, a live snapshot of the screen – its bar and its page – goes under
/// it and the web pops, unanimated, beneath – so what the swipe reveals is the real
/// previous screen, and letting go swaps nothing. The page beneath follows a step behind
/// the finger under a fading shade, as a native pop's does. A release that does not
/// commit slides the snapshot home, and the web is asked to restore the screen it shows.
@MainActor
final class BackSwipe: NSObject, UIGestureRecognizerDelegate {
  /// The gesture, which the webview's own scrolling is made to wait for.
  let gesture = UIScreenEdgePanGestureRecognizer()

  /// Whether a swipe is under way, between the finger landing and the release.
  var isActive: Bool {
    layers != nil
  }

  /// Whether the leaving screen's picture is over the page, from the finger landing or the
  /// back button until the picture has settled – while the page beneath changes unseen.
  private(set) var isCovering = false

  /// The snapshot sliding under the finger, and the shade over the page beneath it.
  private var layers: (preview: UIView, shade: UIView)?

  private weak var host: UIView?
  private let stage: () -> UIView?
  private let webView: () -> WKWebView?
  private let canBegin: () -> Bool
  private let onBegin: () -> Void
  private let onEnd: (_ commits: Bool) -> Void

  /// How far behind the finger the page beneath starts, as a share of the width, and how
  /// dark its shade; both ease to nothing as the swipe completes.
  private let lag: CGFloat = 0.3
  private let darkness: CGFloat = 0.1

  /// - Parameters:
  ///   - host: the view the gesture is on
  ///   - stage: the view holding the bar and the page, which is pictured as the finger
  ///     lands and which the swipe's layers cover
  ///   - webView: the webview the swipe uncovers, read as the finger lands
  ///   - canBegin: whether there is a layer to pop, asked before the gesture begins so it
  ///     fails at once, and leaves the touch to the page, wherever there is not
  ///   - onBegin: asks the web to pop beneath the snapshot
  ///   - onEnd: told whether the release committed, before the snapshot settles
  init(
    host: UIView,
    stage: @escaping () -> UIView?,
    webView: @escaping () -> WKWebView?,
    canBegin: @escaping () -> Bool,
    onBegin: @escaping () -> Void,
    onEnd: @escaping (_ commits: Bool) -> Void,
  ) {
    self.host = host
    self.stage = stage
    self.webView = webView
    self.canBegin = canBegin
    self.onBegin = onBegin
    self.onEnd = onEnd
    super.init()
    gesture.edges = .left
    gesture.delegate = self
    gesture.addTarget(self, action: #selector(handle))
    host.addGestureRecognizer(gesture)
  }

  func gestureRecognizerShouldBegin(_: UIGestureRecognizer) -> Bool {
    !isActive && canBegin()
  }

  @objc private func handle(_ gesture: UIScreenEdgePanGestureRecognizer) {
    guard let stage = stage(), let page = webView()?.scrollView.layer else { return }
    let width = stage.bounds.width

    switch gesture.state {
      case .began:
        begin(on: stage, over: page)

      case .changed:
        guard let layers else { return }
        let travel = max(0, gesture.translation(in: stage).x)
        let remaining = 1 - min(1, travel / width)
        layers.preview.frame.origin.x = travel
        layers.shade.alpha = darkness * remaining
        withoutActions {
          page.sublayerTransform = CATransform3DMakeTranslation(-lag * width * remaining, 0, 0)
        }
        relayOut(page)

      case .ended, .cancelled, .failed:
        guard let current = layers else { return }
        layers = nil
        let translation = gesture.translation(in: stage).x
        let velocity = gesture.velocity(in: stage).x
        // A flick commits, and so does a release past halfway that is not moving back.
        let commits = gesture.state == .ended
          && (velocity > 500 || (translation > width / 2 && velocity > -200))
        onEnd(commits)
        settle(current, over: page, width: width, commits: commits, timing: release)

      default:
        break
    }
  }

  /// Pops as a committed swipe does, with no finger: the screen slides away from where it
  /// is, on the page slide's own curve, once the page beneath is ready to be seen.
  ///
  /// - Parameter whenReady: calls back once the popped page has drawn where it was left,
  ///   which the slide waits for, because a finger uncovers the page beneath slowly enough
  ///   for it to settle and a slide does not
  /// - Returns: Whether it began, which it does only where there is a layer to pop.
  func pop(whenReady: (@escaping () -> Void) -> Void) -> Bool {
    guard !isActive, canBegin(), let stage = stage(), let page = webView()?.scrollView.layer
    else { return false }
    begin(on: stage, over: page)
    guard let current = layers else { return false }
    layers = nil
    onEnd(true)
    let width = stage.bounds.width
    let timing = slide
    whenReady { [weak self] in
      self?.settle(current, over: page, width: width, commits: true, timing: timing)
    }
    return true
  }

  /// How long a released swipe takes to settle, and on what curve.
  private let release = Timing(
    duration: 0.25,
    from: CGPoint(x: 0, y: 0),
    to: CGPoint(x: 0.58, y: 1),
  )

  /// How long a back slides, and on what curve – the web's own page slide's, so a back
  /// from the button moves as a push does.
  private let slide = Timing(
    duration: 0.3,
    from: CGPoint(x: 0.32, y: 0.72),
    to: CGPoint(x: 0.35, y: 1),
  )

  /// Settles the screen and the page beneath where a release leaves them – the screen
  /// gone and the page in place, or the screen back and the page a step behind it.
  private func settle(
    _ layers: (preview: UIView, shade: UIView),
    over page: CALayer,
    width: CGFloat,
    commits: Bool,
    timing: Timing,
  ) {
    let (preview, shade) = layers
    // The page's offset is a layer's, outside UIKit's animations, so it is eased by Core
    // Animation alongside them.
    let settle = CABasicAnimation(keyPath: "sublayerTransform")
    settle.fromValue = NSValue(caTransform3D: page.sublayerTransform)
    settle.duration = timing.duration
    settle.timingFunction = CAMediaTimingFunction(
      controlPoints: Float(timing.from.x),
      Float(timing.from.y),
      Float(timing.to.x),
      Float(timing.to.y),
    )
    withoutActions {
      page.sublayerTransform = commits
        ? CATransform3DIdentity
        : CATransform3DMakeTranslation(-lag * width, 0, 0)
    }
    relayOut(page)
    page.add(settle, forKey: "backSwipe")
    let animator = UIViewPropertyAnimator(
      duration: timing.duration,
      timingParameters: UICubicTimingParameters(
        controlPoint1: timing.from,
        controlPoint2: timing.to,
      ),
    )
    animator.addAnimations {
      preview.frame.origin.x = commits ? width : 0
      shade.alpha = commits ? 0 : self.darkness
    }
    animator.addCompletion { _ in
      preview.removeFromSuperview()
      shade.removeFromSuperview()
      self.withoutActions {
        page.sublayerTransform = CATransform3DIdentity
      }
      self.relayOut(page)
      // A swipe begun while this one settled covers the page still.
      self.isCovering = self.isActive
    }
    animator.startAnimation()
  }

  /// How long a settle takes, and the control points of its cubic curve.
  private struct Timing {
    let duration: TimeInterval
    let from: CGPoint
    let to: CGPoint
  }

  /// The page beneath moves by its scroll view's sublayer transform rather than the
  /// webview's own, because the navigation bar lays its large title out against the
  /// scroll view's frame, and a moved frame would carry the title with it.
  private func begin(on stage: UIView, over page: CALayer) {
    guard let preview = stage.snapshotView(afterScreenUpdates: false) else { return }
    preview.frame = stage.bounds
    // The seam a native pop draws: a soft shadow off the sliding screen's edge.
    preview.layer.shadowColor = UIColor.black.cgColor
    preview.layer.shadowOpacity = 0.2
    preview.layer.shadowRadius = 6
    preview.layer.shadowOffset = CGSize(width: -3, height: 0)
    let shade = UIView(frame: stage.bounds)
    shade.backgroundColor = .black
    shade.alpha = darkness
    shade.isUserInteractionEnabled = false
    stage.addSubview(shade)
    stage.addSubview(preview)
    withoutActions {
      page.sublayerTransform = CATransform3DMakeTranslation(-lag * stage.bounds.width, 0, 0)
    }
    layers = (preview, shade)
    isCovering = true
    onBegin()
  }

  /// Lays the scroll view out again after its sublayer transform moved. The scroll edge
  /// effect behind the bar is placed against the bar's frame as seen through that
  /// transform, so one laid out at another offset – as the popped page restores its scroll
  /// – stays out of step with the bar by the difference, until the next scroll.
  private func relayOut(_ page: CALayer) {
    page.setNeedsLayout()
    page.layoutIfNeeded()
  }

  private func withoutActions(_ change: () -> Void) {
    CATransaction.begin()
    CATransaction.setDisableActions(true)
    change()
    CATransaction.commit()
  }
}
