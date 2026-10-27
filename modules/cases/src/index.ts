/**
 * The cases module's public surface – the route table the application mounts, the widget
 * table it merges for the start screen, the section label the application's menus share
 * with the screens, the entries the application puts in a person's and a unit's menus,
 * since those screens belong to another module, and what the service lets the reader do,
 * which the application's section gate follows. The screens and the domain types behind them
 * stay inside, because the screens arrive through the tables rather than by name.
 */

export { casesRoutes } from "./routes"
export { casesPersonMenu, casesUnitMenu } from "./ui/menus"
export { casesSectionLabel } from "./ui/section-label"
export { useCasesAccess } from "./ui/use-cases-access"
export type { CasesAccess } from "./ui/use-cases-access"
export { casesWidgets } from "./widgets"
