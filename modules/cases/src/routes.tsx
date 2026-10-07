import type { Address, Routes } from "@scouterna/wsj27-campfire-ui"

import { CaseRoute } from "./ui/screens/case/CaseRoute"
import { CasesScreen } from "./ui/screens/cases/CasesScreen"
import { NewCaseForPersonRoute } from "./ui/screens/newcase/NewCaseForPersonRoute"
import { NewCaseScreen } from "./ui/screens/newcase/NewCaseScreen"
import { PersonCasesRoute } from "./ui/screens/personcases/PersonCasesRoute"

declare module "@scouterna/wsj27-campfire-ui" {
  interface RouteRegistry {
    /**
     * The health team's cases, the open ones first and the closed ones on request.
     */
    "/cases": Address<"cases">
    /**
     * One case, its notes, and the way to write on it, close it, or reopen it.
     */
    "/cases/$caseId": Address<"cases">
    /**
     * Opening a case about a person, under a title.
     */
    "/cases/new": Address<"cases">
    /**
     * Opening a case with the person already chosen, by member number.
     */
    "/cases/new/$memberNo": Address<"cases">
    /**
     * Every case about one person, by member number.
     */
    "/cases/person/$memberNo": Address<"cases">
  }
}

/**
 * The cases module's screens, by address. `satisfies` rather than a type annotation, so
 * the table's keys stay the narrow literals the router checks links against.
 *
 * Opening a case and one person's cases are literal segments where one case is a
 * parameter, which is what keeps `new` and `person` from being read as a case's
 * identifier.
 */
export const casesRoutes = {
  "/cases": {
    Component: CasesScreen,
    tab: "cases",
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
  "/cases/person/$memberNo": {
    Component: PersonCasesRoute,
    parent: "/cases",
    tab: "cases",
  },
} satisfies Routes
