import type { WidgetsFrom } from "@scouterna/wsj27-campfire-ui"

import { CountdownWidget } from "./ui/widgets/countdown/CountdownWidget"

/**
 * The widgets the journey module fills, for the application to merge into its table.
 * Held to this module's own ids, so one another module declared cannot be filled here.
 */
export const journeyWidgets = {
  "journey:countdown": CountdownWidget,
} satisfies WidgetsFrom<"journey">
