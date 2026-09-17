import type { Address, Routes } from "@scouterna/wsj27-campfire-ui"

import { ParticipantsScreen } from "./ParticipantsScreen"

declare module "@scouterna/wsj27-campfire-ui" {
  interface RouteRegistry {
    /**
     * The list of participants – for a leader, their own unit.
     */
    "/participants": Address<"participants">
  }
}

/**
 * The participants module's screens, by address. `satisfies` rather than a type
 * annotation, so the table's keys stay the narrow literals the router checks links
 * against.
 */
export const participantsRoutes = {
  "/participants": { Component: ParticipantsScreen, tab: "participants" },
} satisfies Routes
