import type { Address, Routes } from "@scouterna/wsj27-campfire-ui"

import { FoodRoute } from "./ui/screens/food/FoodRoute"
import { FoodStartRoute } from "./ui/screens/food/FoodStartRoute"
import { toFoodSearch } from "./ui/screens/food/search"
import { GroupRoute } from "./ui/screens/groups/GroupRoute"
import { GroupsScreen } from "./ui/screens/groups/GroupsScreen"
import { toGroupsSearch } from "./ui/screens/groups/search"
import { ParticipantRoute } from "./ui/screens/participant/ParticipantRoute"
import { ParticipantsScreen } from "./ui/screens/participants/ParticipantsScreen"
import { toParticipantsSearch } from "./ui/screens/participants/search"
import { PatrolsScreen } from "./ui/screens/patrols/PatrolsScreen"

declare module "@scouterna/wsj27-campfire-ui" {
  interface RouteRegistry {
    /**
     * Diets and food allergies by allergen – a leader's own unit, or the health team's
     * choice of every unit. It carries the rows left expanded in its search params, so a
     * return from a person finds them open.
     */
    "/food": Address<"participants">
    /**
     * One unit's diets and food allergies, by unit number, with the rows left expanded in
     * its search params as the start screen carries them.
     */
    "/food/$unit": Address<"participants">
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
     * The groups view: every unit the viewer may read, the IST patrols, and the
     * contingent management by funktion. It carries its filter in its search params, so
     * coming back from a group keeps it.
     */
    "/participants/groups": Address<"participants">
    /**
     * One group of the groups view – a unit number, `ist-` and a patrol number, `ist`, or
     * `cmt-` and a funktion.
     */
    "/participants/groups/$group": Address<"participants">
    /**
     * A leader's own unit divided into its patrols, where the leader arranges them.
     */
    "/participants/patrols": Address<"participants">
  }
}

/**
 * The participants module's screens, by address. `satisfies` rather than a type
 * annotation, so the table's keys stay the narrow literals the router checks links
 * against.
 *
 * The groups view sits under the list and one group under the view, so back walks the way
 * the reader came – and the view's segment and the patrols' are literals where a person's
 * is a parameter, which is what keeps a unit from being read as a member number.
 */
export const participantsRoutes = {
  "/food": {
    Component: FoodStartRoute,
    tab: "food",
    validateSearch: toFoodSearch,
  },
  "/food/$unit": {
    Component: FoodRoute,
    parent: "/food",
    tab: "food",
    validateSearch: toFoodSearch,
  },
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
  "/participants/groups": {
    Component: GroupsScreen,
    parent: "/participants",
    tab: "participants",
    validateSearch: toGroupsSearch,
  },
  "/participants/groups/$group": {
    Component: GroupRoute,
    parent: "/participants/groups",
    tab: "participants",
  },
  "/participants/patrols": {
    Component: PatrolsScreen,
    parent: "/participants",
    tab: "participants",
  },
} satisfies Routes
