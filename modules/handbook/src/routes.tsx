import type { Address, Routes } from "@scouterna/wsj27-campfire-ui"

import { ChapterRoute } from "./ui/screens/chapter/ChapterRoute"
import { ContentsScreen } from "./ui/screens/contents/ContentsScreen"
import { toHandbookSearch } from "./ui/screens/contents/handbook-search"

declare module "@scouterna/wsj27-campfire-ui" {
  interface RouteRegistry {
    /**
     * The handbook's contents, and its search.
     */
    "/handbook": Address<"handbook">
    /**
     * One chapter, by its slug in the CMS, with a page's slug as the section to open at.
     */
    "/handbook/$chapter": Address<"handbook">
  }
}

/**
 * The handbook's screens: the contents, and each chapter under it.
 */
export const handbookRoutes = {
  "/handbook": { Component: ContentsScreen, tab: "handbook", validateSearch: toHandbookSearch },
  "/handbook/$chapter": { Component: ChapterRoute, parent: "/handbook", tab: "handbook" },
} satisfies Routes
