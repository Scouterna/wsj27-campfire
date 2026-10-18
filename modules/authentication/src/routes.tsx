import type { Address, Routes } from "@scouterna/wsj27-campfire-ui"

import { ImpersonationConfirmRoute } from "./ui/screens/ImpersonationConfirmScreen/ImpersonationConfirmRoute"
import { ImpersonationScreen } from "./ui/screens/ImpersonationScreen/ImpersonationScreen"
import { ProfileScreen } from "./ui/screens/ProfileScreen/ProfileScreen"

declare module "@scouterna/wsj27-campfire-ui" {
  interface RouteRegistry {
    /**
     * The signed-in person's own page, and the way out.
     */
    "/profile": Address<"authentication">
    /**
     * Everybody Campfire can be shown as, where the auth service offers impersonation.
     */
    "/profile/impersonate": Address<"authentication">
    /**
     * The confirmation before Campfire is shown as one of them, by member number.
     */
    "/profile/impersonate/$memberNo": Address<"authentication">
  }
}

/**
 * The authentication module's screens, by address.
 *
 * The profile page belongs to the home section, which is everybody's, but names no
 * parent, because it is reached from the chrome at any depth of any section and is a
 * detail of none of them. Impersonation is reached from the profile page, so its screens
 * descend from it. They are in the home section like the page they come from, and a
 * screen that the auth service does not offer says so rather than being hidden, because
 * only the service knows whether it is offered.
 */
export const authenticationRoutes = {
  "/profile": { Component: ProfileScreen, tab: "home" },
  "/profile/impersonate": { Component: ImpersonationScreen, parent: "/profile", tab: "home" },
  "/profile/impersonate/$memberNo": {
    Component: ImpersonationConfirmRoute,
    parent: "/profile/impersonate",
    tab: "home",
  },
} satisfies Routes
