import SwiftUI
import UIKit

/// The chrome once someone is signed in: a native tab bar, and a native navigation bar
/// per tab showing whatever its page last reported.
///
/// Something filling the screen has both bars step aside for it, and they come back
/// together in one step.
struct MainView: View {
  @Environment(AppModel.self) private var model

  var body: some View {
    // The webviews ignore the safe area so they underlap both bars; WebKit's automatic
    // content insets keep the page clear of them.
    Tabs(model: model)
      .ignoresSafeArea()
  }
}

/// The tab bar, hosted in UIKit rather than SwiftUI.
///
/// A page that fills the screen hides the bar with UIKit's own call, in step with the
/// navigation bar, and that call is UIKit's alone: SwiftUI's tab view lays its content out
/// above a bar it hides, so what fills the screen would stop short of the bottom edge.
private struct Tabs: UIViewControllerRepresentable {
  let model: AppModel

  func makeCoordinator() -> Coordinator {
    Coordinator(model: model)
  }

  func makeUIViewController(context: Context) -> UITabBarController {
    let controller = UITabBarController()
    controller.delegate = context.coordinator
    controller.view.backgroundColor = UIColor(Palette.paper)
    return controller
  }

  func updateUIViewController(_ controller: UITabBarController, context: Context) {
    let coordinator = context.coordinator
    coordinator.showTabs(model.sections, in: controller)

    // Reading every tab's observable state here is what runs this update again when any
    // page reports something new. Each stack changes only what differs.
    for section in model.sections {
      guard let tab = model.tab(for: section), let navigation = coordinator.stacks[section.id]
      else { continue }
      WebStack.update(navigation, tab: tab, profile: model.profile, theme: model.theme)
    }

    let selected = controller.tabs.first { $0.identifier == model.activeSectionId }
    if let selected, controller.selectedTab !== selected {
      controller.selectedTab = selected
    }
    let ink = UIColor(model.theme.ink)
    if controller.view.tintColor != ink {
      controller.view.tintColor = ink
    }
  }

  /// The tabs' stacks, and the delegate that tells the model which tab is showing.
  @MainActor
  final class Coordinator: NSObject, UITabBarControllerDelegate {
    private let model: AppModel

    /// Each section's navigation stack, kept across a rebuild of the tabs so a section
    /// that stays keeps the screen it shows.
    private(set) var stacks: [String: UINavigationController] = [:]

    /// The sections the bar draws, compared so the tabs are rebuilt only when they change.
    private var shown: [Section] = []

    init(model: AppModel) {
      self.model = model
    }

    func showTabs(_ sections: [Section], in controller: UITabBarController) {
      guard sections != shown else { return }
      shown = sections
      let ids = Set(sections.map(\.id))
      stacks = stacks.filter { ids.contains($0.key) }
      let tabs = sections.map { section in
        let navigation = stacks[section.id] ?? WebStack.make()
        stacks[section.id] = navigation
        return UITab(
          title: section.label,
          image: UIImage(systemName: section.symbol),
          identifier: section.id,
        ) { _ in navigation }
      }
      controller.setTabs(tabs, animated: false)
    }

    func tabBarController(_: UITabBarController, shouldSelectTab tab: UITab) -> Bool {
      // A tap on the tab already showing is the platform's gesture for "back to this
      // tab's top", which the tab decides how to answer.
      if tab.identifier == model.activeSectionId {
        model.activeTab?.reselect()
        return false
      }
      return true
    }

    func tabBarController(
      _: UITabBarController,
      didSelectTab selectedTab: UITab,
      previousTab _: UITab?,
    ) {
      model.activeSectionId = selectedTab.identifier
    }
  }
}
