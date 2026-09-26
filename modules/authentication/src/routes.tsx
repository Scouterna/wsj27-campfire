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
 * The authentication module's screens, by address.
 *
 * The profile page belongs to the home section, which is everybody's, but names no
 * parent, because it is reached from the chrome at any depth of any section and is a
 * detail of none of them.
 */
export const authenticationRoutes = {
  "/profile": { Component: ProfileScreen, tab: "home" },
} satisfies Routes
