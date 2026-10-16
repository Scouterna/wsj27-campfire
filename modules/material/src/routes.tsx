import type { Address, Routes } from "@scouterna/wsj27-campfire-ui"

import { FolderRoute } from "./ui/screens/material/FolderRoute"
import { MaterialScreen } from "./ui/screens/material/MaterialScreen"
import { SocialScreen } from "./ui/screens/social/SocialScreen"

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
    /**
     * A photo in one of the contingent's frames, for social media.
     */
    "/material/skapa-bild": Address<"material">
  }
}

/**
 * The material module's screens, by address.
 *
 * Every folder answers at one address whatever its depth, because a Drive id is unique
 * across the material. The image maker's address is a literal, which the router matches
 * before a folder's, and no Drive id is a Swedish word.
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
  "/material/skapa-bild": {
    Component: SocialScreen,
    parent: "/material",
    tab: "material",
  },
} satisfies Routes
