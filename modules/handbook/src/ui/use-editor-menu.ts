import { host } from "@scouterna/wsj27-campfire-host"
import type { OverflowMenuItem } from "@scouterna/wsj27-campfire-ui"
import { hasAnyRole, useRoles } from "@scouterna/wsj27-campfire-utils"
import { useMemo } from "react"

import { editorAddress } from "../data/editor"

/**
 * Whether the reader may edit the handbook – anyone in the contingent management, which
 * is who the CMS lets in. Everyone else is offered no way into it, because a way that
 * leads to a refusal is worse than none.
 * @returns True for an editor.
 */
export function useCanEdit(): boolean {
  return hasAnyRole(useRoles(), "cmt")
}

/**
 * The contents' menu entry into the CMS's list of every page, for an editor.
 * @returns The menu's entries, or undefined when the reader may not edit.
 */
export function useEditorMenu(): readonly OverflowMenuItem[] | undefined {
  const canEdit = useCanEdit()

  // Held still between renders, because the chrome redraws its bar whenever the declared
  // menu changes identity.
  return useMemo(() => {
    if (!canEdit) {
      return
    }
    return [
      {
        label: "Redigera handboken",
        onSelect: () => {
          openEditor(editorAddress())
        },
      },
    ]
  }, [canEdit])
}

/**
 * Opens the CMS. A browser keeps Campfire open in its own tab beside the editor; a shell's
 * web view has no second tab, so there the editor takes the view over.
 * @param address The editor's origin-relative address.
 */
export function openEditor(address: string): void {
  if (host.tier === "browser") {
    window.open(address, "_blank", "noopener")
    return
  }
  location.assign(address)
}
