/**
 * The participants module's public surface – the route table the application mounts, the
 * section label the application's menus share with the screens, the provider that tells
 * this module's queries who is reading, and the widget table the application merges. The
 * screens and the domain types behind them stay inside, because the screens arrive
 * through the tables rather than by name.
 */

export { ViewerProvider } from "./data/viewer"
export type { Viewer } from "./data/viewer"
export { participantsRoutes } from "./routes"
export { participantsSectionLabel } from "./ui/screens/participants/section-label"
export { participantsWidgets } from "./widgets"
