import type { WidgetsFrom } from "@scouterna/wsj27-campfire-ui"

import { MyCasesWidget } from "./ui/widgets/mycases/MyCasesWidget"
import { OpenCasesWidget } from "./ui/widgets/opencases/OpenCasesWidget"

/**
 * The widgets the cases module fills, for the application to merge into its table. Held
 * to this module's own ids, so one another module declared cannot be filled here.
 */
export const casesWidgets = {
  "cases:mine": MyCasesWidget,
  "cases:open": OpenCasesWidget,
} satisfies WidgetsFrom<"cases">
