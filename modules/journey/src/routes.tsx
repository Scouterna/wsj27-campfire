import type { Address, Routes } from "@scouterna/wsj27-campfire-ui"

import { JourneyScreen } from "./ui/screens/journey/JourneyScreen"
import { toJourneySearch } from "./ui/screens/journey/search"
import { OverviewScreen } from "./ui/screens/overview/OverviewScreen"

declare module "@scouterna/wsj27-campfire-ui" {
  interface RouteRegistry {
    /**
     * A unit's journey – the reader's own, or for the contingent management the one the
     * search params name, at the moment they carry.
     */
    "/journey": Address<"journey">
    /**
     * Where every unit and IST patrol is at a moment – the contingent management's.
     */
    "/journey/oversikt": Address<"journey">
  }
}

/**
 * The journey module's screens, by address. Both sit under home rather than in a section
 * of their own, because they are opened from the countdown on the start screen rather than
 * from the menus.
 */
export const journeyRoutes = {
  "/journey": {
    Component: JourneyScreen,
    parent: "/",
    tab: "home",
    validateSearch: toJourneySearch,
  },
  "/journey/oversikt": {
    Component: OverviewScreen,
    parent: "/",
    tab: "home",
    validateSearch: toJourneySearch,
  },
} satisfies Routes
