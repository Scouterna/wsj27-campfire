import { host } from "@scouterna/wsj27-campfire-host"
import type { OverflowMenuItem } from "@scouterna/wsj27-campfire-ui"
import { hasAnyRole, useRoles } from "@scouterna/wsj27-campfire-utils"
import { useMemo } from "react"

import { editorAddress } from "../data/editor"

/**
 * The page menu's way into the CMS, for the people who may edit the handbook – anyone in
 * the contingent management, which is who the CMS lets in. Everyone else gets no menu,
 * because an entry that leads to a refusal is worse than none.
 * @param chapterId The CMS's id for the chapter on screen, or undefined on the contents,
 * which opens the list of every page.
 * @returns The menu's entries, or undefined when the reader may not edit.
 */
export function useEditorMenu(chapterId?: number): readonly OverflowMenuItem[] | undefined {
  const roles = useRoles()
  const canEdit = hasAnyRole(roles, "cmt")

  // Held still between renders, because the chrome redraws its bar whenever the declared
  // menu changes identity.
  return useMemo(() => {
    if (!canEdit) {
      return
    }
    const address = editorAddress(chapterId)
    return [
      {
        label: chapterId === undefined ? "Redigera handboken" : "Redigera kapitlet",
        onSelect: () => {
          openEditor(address)
        },
      },
    ]
  }, [canEdit, chapterId])
}

/**
 * Opens the CMS. A browser keeps Campfire open in its own tab beside the editor; a shell's
 * web view has no second tab, so there the editor takes the view over.
 * @param address The editor's origin-relative address.
 */
function openEditor(address: string): void {
  if (host.tier === "browser") {
    window.open(address, "_blank", "noopener")
    return
  }
  location.assign(address)
}
