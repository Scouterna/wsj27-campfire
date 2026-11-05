/**
 * The participants module's public surface – the route table the application mounts, the
 * section label the application's menus share with the screens, the provider that tells
 * this module's queries who is reading, the provider through which the application puts
 * other modules' entries in a person's and a unit's menus, the widget table the
 * application merges, and the person's care as a doorway, which the application places
 * on the case screens' person card because those screens belong to another module. The
 * screens and the domain types behind them stay inside, because the screens arrive through
 * the tables rather than by name.
 */

export { ViewerProvider } from "./data/viewer"
export type { Viewer } from "./data/viewer"
export { participantsRoutes } from "./routes"
export { ActionsProvider } from "./ui/actions"
export type { ActionsProviderProps } from "./ui/actions"
export { CareGlance } from "./ui/components/careglance/CareGlance"
export type { CareGlanceProps } from "./ui/components/careglance/CareGlance"
export { participantsSectionLabel } from "./ui/screens/participants/section-label"
export { participantsWidgets } from "./widgets"
