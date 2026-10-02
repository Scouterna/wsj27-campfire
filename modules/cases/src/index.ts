/**
 * The cases module's public surface – the route table the application mounts, the
 * section label the application's menus share with the screens, and the entries the
 * application puts in a person's menu, since the person screen belongs to another module. The screens and the
 * domain types behind them stay inside, because the screens arrive through the table
 * rather than by name.
 */

export { casesRoutes } from "./routes"
export { casesPersonMenu } from "./ui/person-menu"
export { casesSectionLabel } from "./ui/section-label"
