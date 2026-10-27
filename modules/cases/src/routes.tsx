import type { Address, Routes } from "@scouterna/wsj27-campfire-ui"

import { CaseRoute } from "./ui/screens/case/CaseRoute"
import { CasesScreen } from "./ui/screens/cases/CasesScreen"
import { toCasesSearch } from "./ui/screens/cases/search"
import { NewCaseForPersonRoute } from "./ui/screens/newcase/NewCaseForPersonRoute"
import { NewCaseForUnitRoute } from "./ui/screens/newcase/NewCaseForUnitRoute"
import { NewCaseScreen } from "./ui/screens/newcase/NewCaseScreen"
import { PersonCasesRoute } from "./ui/screens/personcases/PersonCasesRoute"
import { UnitCasesRoute } from "./ui/screens/unitcases/UnitCasesRoute"

declare module "@scouterna/wsj27-campfire-ui" {
  interface RouteRegistry {
    /**
     * The cases the reader's roles reach – their own, those that wait, those under way,
     * or the closed ones, by the list the address names.
     */
    "/cases": Address<"cases">
    /**
     * One case, its notes, and the way to write on it, close it, or reopen it.
     */
    "/cases/$caseId": Address<"cases">
    /**
     * Opening a case, under a title.
     */
    "/cases/new": Address<"cases">
    /**
     * Opening a case with the person already chosen, by member number.
     */
    "/cases/new/$memberNo": Address<"cases">
    /**
     * Opening a case with a unit already chosen as what it is about, by its number.
     */
    "/cases/new/unit/$unitNumber": Address<"cases">
    /**
     * Every case about one person, by member number.
     */
    "/cases/person/$memberNo": Address<"cases">
    /**
     * Every case about one unit, as a whole or about anyone in it, by its number.
     */
    "/cases/unit/$unitNumber": Address<"cases">
  }
}

/**
 * The cases module's screens, by address. `satisfies` rather than a type annotation, so
 * the table's keys stay the narrow literals the router checks links against.
 *
 * Opening a case, one person's cases, and one unit's are literal segments where one case
 * is a parameter, which is what keeps `new`, `person`, and `unit` from being read as a
 * case's identifier.
 */
export const casesRoutes = {
  "/cases": {
    Component: CasesScreen,
    tab: "cases",
    validateSearch: toCasesSearch,
  },
  "/cases/$caseId": {
    Component: CaseRoute,
    parent: "/cases",
    tab: "cases",
  },
  "/cases/new": {
    Component: NewCaseScreen,
    parent: "/cases",
    tab: "cases",
  },
  "/cases/new/$memberNo": {
    Component: NewCaseForPersonRoute,
    parent: "/cases",
    tab: "cases",
  },
  "/cases/new/unit/$unitNumber": {
    Component: NewCaseForUnitRoute,
    parent: "/cases",
    tab: "cases",
  },
  "/cases/person/$memberNo": {
    Component: PersonCasesRoute,
    parent: "/cases",
    tab: "cases",
  },
  "/cases/unit/$unitNumber": {
    Component: UnitCasesRoute,
    parent: "/cases",
    tab: "cases",
  },
} satisfies Routes
