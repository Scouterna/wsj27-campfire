import type { Address, Routes } from "@scouterna/wsj27-campfire-ui"

import { FaqScreen } from "./ui/screens/contents/FaqScreen"
import { FolderRoute } from "./ui/screens/folder/FolderRoute"

declare module "@scouterna/wsj27-campfire-ui" {
  interface RouteRegistry {
    /**
     * The FAQ's folders, and a search across every question and answer.
     */
    "/faq": Address<"faq">
    /**
     * One folder of it, by the help center's id, with a question's id as the hash to open
     * at.
     */
    "/faq/$folder": Address<"faq">
  }
}

/**
 * The FAQ's screens: the contents, and each folder under it.
 */
export const faqRoutes = {
  "/faq": { Component: FaqScreen, tab: "faq" },
  "/faq/$folder": { Component: FolderRoute, parent: "/faq", tab: "faq" },
} satisfies Routes
