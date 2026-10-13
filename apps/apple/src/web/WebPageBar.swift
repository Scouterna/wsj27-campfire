import UIKit

/// The bars a page controller has been told of, and the one it shows.
struct Bars {
  /// The bar the page last reported.
  var reported: Bar?
  /// The bar on screen.
  var shown: Bar?
  /// The bar on screen as a back swipe began, put back if the swipe is canceled.
  var swipedFrom: Bar?
  /// The bar a canceled swipe popped to, held back until the page reports anything else
  /// – the screen its forward restored.
  var canceled: Bar?
}

/// The navigation bar, as the page reports it.
extension WebPageController {
  /// Show what the page reported in the bar, changing only what differs. A new title
  /// arrives as a push's does, and the page beneath it slides. During a back swipe the bar
  /// beneath the sliding picture changes with the page beneath it, and a canceled swipe
  /// puts back the bar it started from.
  func show(_ bar: Bar) {
    if let canceled = bars.canceled {
      guard bar != canceled else { return }
      bars.canceled = nil
    }
    bars.reported = bar
    apply(bar)
  }

  private func apply(_ bar: Bar) {
    guard bar != bars.shown, let webTab else { return }
    let shown = bars.shown
    bars.shown = bar
    let setTitle = { [self] in
      navigationItem.title = bar.title
      fitLargeTitle()
    }
    if let shown, shown.title != bar.title {
      pushTitle(from: shown.title, setTitle)
    } else {
      setTitle()
    }
    if shown?.canGoBack != bar.canGoBack {
      navigationItem.leftBarButtonItem = bar.backItem(for: webTab)
    }
    if shown?.trailing != bar.trailing {
      navigationItem.setRightBarButtonItems(bar.trailingItems(for: webTab), animated: shown != nil)
    }
  }

  /// Change the title as a push does. The inline title is a label inside the bar, which a
  /// fade on that label covers once the bar has laid the new title out in the same step.
  /// An open large title slides with the page instead: the new one in from the trailing
  /// edge, and a picture of the old one a step towards the leading edge, faded out before
  /// the new one can reach it.
  ///
  /// The fade is on the label alone, because a fade on the whole bar captures its glass
  /// items as flat pictures, and an item leaving in the same step shows as a square
  /// around its glass. The inline label is found by the title it shows and the large title
  /// by its class name, neither of which UIKit promises; without them the title cuts.
  /// Beneath a back's picture of the leaving screen the title changes at once, because the
  /// page it sits on already slides out from under it.
  private func pushTitle(from old: String, _ change: () -> Void) {
    guard let navigationBar = navigationController?.navigationBar else {
      change()
      return
    }
    if !old.isEmpty, let inline = navigationBar.label(showing: old) {
      let fade = CATransition()
      fade.type = .fade
      fade.duration = 0.25
      inline.layer.add(fade, forKey: "title")
    }
    // The bar keeps a stand-in for the large title, as tall as the title is open, which
    // is what tells an open title from one collapsed out of sight.
    let isOpen = navigationBar.subviews.contains { view in
      String(describing: type(of: view)).contains("LargeTitle") && view.bounds.height > 1
    }
    guard
      !old.isEmpty, isOpen, !isCovered, let scroll = attached?.scrollView,
      let large = scroll.subviews.first(where: { view in
        String(describing: type(of: view)).contains("LargeTitle")
      }),
      let label = large.subviews.first(where: { $0 is UILabel }),
      let picture = label.snapshotView(afterScreenUpdates: false)
    else {
      change()
      navigationBar.layoutIfNeeded()
      return
    }
    picture.frame = label.convert(label.bounds, to: scroll)
    picture.isUserInteractionEnabled = false
    scroll.insertSubview(picture, aboveSubview: large)
    change()
    navigationBar.layoutIfNeeded()
    slide(large, in: picture, across: scroll.bounds.width)
  }

  /// Slide the large title in from the trailing edge, on the page slide's own curve, while
  /// the picture of the old one moves a step towards the leading edge and fades.
  private func slide(_ large: UIView, in leaving: UIView, across width: CGFloat) {
    let duration = 0.3
    let from = CGPoint(x: 0.32, y: 0.72)
    let to = CGPoint(x: 0.35, y: 1)
    // Additive, so the slide holds wherever UIKit lays the title out meanwhile.
    let arrive = CABasicAnimation(keyPath: "position.x")
    arrive.fromValue = width
    arrive.toValue = 0
    arrive.isAdditive = true
    arrive.duration = duration
    arrive.timingFunction = CAMediaTimingFunction(
      controlPoints: Float(from.x),
      Float(from.y),
      Float(to.x),
      Float(to.y),
    )
    large.layer.add(arrive, forKey: "push")
    let leave = UIViewPropertyAnimator(
      duration: duration,
      timingParameters: UICubicTimingParameters(controlPoint1: from, controlPoint2: to),
    )
    leave.addAnimations {
      leaving.transform = CGAffineTransform(translationX: -0.28 * width, y: 0)
    }
    leave.addCompletion { _ in
      leaving.removeFromSuperview()
    }
    leave.startAnimation()
    // Gone before the arriving title reaches it, which a quarter of the way in it does.
    UIView.animate(withDuration: 0.08, delay: 0, options: .curveEaseOut) {
      leaving.alpha = 0
    }
  }

  /// The large title's face and size for the bar showing, refitted as the width or the
  /// text size changes.
  @objc func fitLargeTitle() {
    guard let bar = bars.shown, let navigationBar = navigationController?.navigationBar else {
      return
    }
    let margins = navigationBar.layoutMargins.left + navigationBar.layoutMargins.right
    let width = navigationBar.bounds.width > 0 ? navigationBar.bounds.width : view.bounds.width
    let attributes = bar.largeTitleAttributes(within: width - margins, traits: traitCollection)
    let current = navigationBar.largeTitleTextAttributes
    let isSame = current?[.font] as? UIFont == attributes[.font] as? UIFont
      && current?[.foregroundColor] as? UIColor == bar.ink
    if !isSame {
      navigationBar.largeTitleTextAttributes = attributes
    }
  }

  /// Remember the bar a back swipe starts from, and ask the web to pop beneath it.
  func swipeDidBegin() {
    bars.swipedFrom = bars.shown
    webTab?.swipeBack()
  }

  /// Keep the bar a committed swipe arrived at, or put back the one a canceled swipe
  /// started from and ask the web to restore its screen.
  func swipeDidEnd(commits: Bool) {
    let from = bars.swipedFrom
    bars.swipedFrom = nil
    guard !commits else { return }
    bars.canceled = bars.reported
    if let from {
      apply(from)
    }
    webTab?.swipeCancel()
  }
}

private extension UIView {
  /// The first label beneath this view showing the text, searched depth first.
  func label(showing text: String) -> UILabel? {
    for subview in subviews {
      if let label = subview as? UILabel, label.text == text {
        return label
      }
      if let label = subview.label(showing: text) {
        return label
      }
    }
    return nil
  }
}
