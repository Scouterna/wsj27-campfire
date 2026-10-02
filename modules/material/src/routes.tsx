import type { Address, Routes } from "@scouterna/wsj27-campfire-ui"

import { FolderRoute } from "./ui/screens/material/FolderRoute"
import { MaterialScreen } from "./ui/screens/material/MaterialScreen"

declare module "@scouterna/wsj27-campfire-ui" {
  interface RouteRegistry {
    /**
     * The contingent's material: a leader's own unit's symbols, the folders, and a
     * search across everything.
     */
    "/material": Address<"material">
    /**
     * One folder of it, by Drive id.
     */
    "/material/$folder": Address<"material">
  }
}

/**
 * The material module's screens, by address.
 *
 * Every folder answers at one address whatever its depth, because a Drive id is unique
 * across the material.
 */
export const materialRoutes = {
  "/material": {
    Component: MaterialScreen,
    tab: "material",
  },
  "/material/$folder": {
    Component: FolderRoute,
    parent: "/material",
    tab: "material",
  },
} satisfies Routes
