import type { WidgetsFrom } from "@scouterna/wsj27-campfire-ui"

import { UnitWidget } from "./ui/widgets/unit/UnitWidget"

/**
 * The widgets the participants module fills, for the application to merge into its
 * table. Held to this module's own ids, so one another module declared cannot be filled here.
 */
export const participantsWidgets = {
  "participants:unit": UnitWidget,
} satisfies WidgetsFrom<"participants">
