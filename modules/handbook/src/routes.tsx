import type { Address, Routes } from "@scouterna/wsj27-campfire-ui"

import { ChapterRoute } from "./ui/screens/chapter/ChapterRoute"
import { ContentsScreen } from "./ui/screens/contents/ContentsScreen"
import { toHandbookSearch } from "./ui/screens/contents/handbook-search"
import { FaqFolderRoute } from "./ui/screens/faqfolder/FaqFolderRoute"
import { PublicHandbookRedirect } from "./ui/screens/public/PublicHandbookRedirect"
import { PublicHandbookScreen } from "./ui/screens/public/PublicHandbookScreen"
import { toPublicSearch } from "./ui/screens/public/public-search"

declare module "@scouterna/wsj27-campfire-ui" {
  interface RouteRegistry {
    /**
     * The handbook's contents and the FAQ's folders, and one search across both.
     */
    "/handbook": Address<"handbook">
    /**
     * One chapter, by its slug in the CMS, with a page's slug as the section to open at.
     */
    "/handbook/$chapter": Address<"handbook">
    /**
     * One folder of the FAQ, by the help center's id, with a question's id as the
     * section to open at.
     */
    "/handbook/faq/$folder": Address<"handbook">
    /**
     * Where the public handbooks are found. With one handbook, it leads straight on to
     * it.
     */
    "/public/handbook": Address<"handbook">
    /**
     * The leaders' handbook as anyone may read it, without signing in – `?pdf` opens it
     * straight into the print dialog. Named for who it is written for, so a handbook
     * for another part of the contingent has an address of its own to take.
     */
    "/public/handbook/leaders": Address<"handbook">
  }
}

/**
 * The handbook's screens: the contents, each chapter under it, and each FAQ folder.
 */
export const handbookRoutes = {
  "/handbook": { Component: ContentsScreen, tab: "handbook", validateSearch: toHandbookSearch },
  "/handbook/$chapter": { Component: ChapterRoute, parent: "/handbook", tab: "handbook" },
  "/handbook/faq/$folder": { Component: FaqFolderRoute, parent: "/handbook", tab: "handbook" },
} satisfies Routes

/**
 * The handbook's screens that need nobody signed in: the public handbook, as one
 * document. The application mounts them outside its gate and its chrome, so they belong
 * to no section.
 */
export const publicHandbookRoutes = {
  "/public/handbook": { Component: PublicHandbookRedirect, validateSearch: toPublicSearch },
  "/public/handbook/leaders": {
    Component: PublicHandbookScreen,
    validateSearch: toPublicSearch,
  },
} satisfies Routes
