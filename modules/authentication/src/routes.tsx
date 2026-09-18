import type { Address, Routes } from "@scouterna/wsj27-campfire-ui"

import { ProfileScreen } from "./ui/screens/ProfileScreen/ProfileScreen"

declare module "@scouterna/wsj27-campfire-ui" {
  interface RouteRegistry {
    /**
     * The signed-in person's own page, and the way out.
     */
    "/profile": Address<"authentication">
  }
}

/**
 * The authentication module's screens, by address. `satisfies` rather than a type
 * annotation, so the table's keys stay the narrow literals the router checks links
 * against.
 *
 * The profile page belongs to the home section, which is everybody's, so the page is
 * too – but it names no parent: it is a start of its own, reached from the chrome at
 * any depth of any section, and a detail of none of them.
 */
export const authenticationRoutes = {
  "/profile": { Component: ProfileScreen, tab: "home" },
} satisfies Routes
