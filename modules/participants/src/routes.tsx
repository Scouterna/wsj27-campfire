import type { Address, Routes } from "@scouterna/wsj27-campfire-ui"

import { ParticipantRoute } from "./ui/screens/participant/ParticipantRoute"
import { ParticipantsScreen } from "./ui/screens/participants/ParticipantsScreen"
import { toParticipantsSearch } from "./ui/screens/participants/search"
import { UnitRoute } from "./ui/screens/units/UnitRoute"
import { UnitsScreen } from "./ui/screens/units/UnitsScreen"

declare module "@scouterna/wsj27-campfire-ui" {
  interface RouteRegistry {
    /**
     * The list of participants – for a leader, their own unit. It carries its narrowing
     * in its search params, so a narrowed list can be shared and returned to.
     */
    "/participants": Address<"participants">
    /**
     * One person in full, by member number.
     */
    "/participants/$memberNo": Address<"participants">
    /**
     * The unit browser: every unit the viewer may read, plus the IST and the contingent
     * management.
     */
    "/participants/units": Address<"participants">
    /**
     * One entry of the browser – a unit number, `ist`, or `cmt`.
     */
    "/participants/units/$unit": Address<"participants">
  }
}

/**
 * The participants module's screens, by address. `satisfies` rather than a type
 * annotation, so the table's keys stay the narrow literals the router checks links
 * against.
 *
 * The browser sits under the list and one unit under the browser, so back walks the way
 * the reader came – and `/participants/units` is a literal segment where
 * `/participants/$memberNo` is a parameter, which is what keeps a unit from being read
 * as a member number.
 */
export const participantsRoutes = {
  "/participants": {
    Component: ParticipantsScreen,
    tab: "participants",
    validateSearch: toParticipantsSearch,
  },
  "/participants/$memberNo": {
    Component: ParticipantRoute,
    parent: "/participants",
    tab: "participants",
  },
  "/participants/units": {
    Component: UnitsScreen,
    parent: "/participants",
    tab: "participants",
  },
  "/participants/units/$unit": {
    Component: UnitRoute,
    parent: "/participants/units",
    tab: "participants",
  },
} satisfies Routes
