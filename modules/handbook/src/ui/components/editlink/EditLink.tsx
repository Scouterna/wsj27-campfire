import { PencilIcon } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import { editorAddress } from "../../../data/editor"
import type { HandbookPage } from "../../../model/Handbook"
import { openEditor, useCanEdit } from "../../use-editor-menu"

import "./EditLink.css"

export type EditLinkProps = {
  /**
   * The page the link opens in the CMS's editor.
   */
  readonly page: HandbookPage
}

/**
 * The way from one page straight into its own editor in the CMS, for an editor and for
 * nobody else. It sits on the page's card rather than in the screen's menu, because the
 * menu scrolls away with the top of the chapter, and the page being read is the one
 * that needs editing.
 * @param props The page.
 * @returns The link, or nothing for a reader who may not edit.
 */
export function EditLink(props: EditLinkProps): ReactElement | null {
  const canEdit = useCanEdit()
  if (!canEdit) {
    return null
  }
  const address = editorAddress(props.page.id)
  return (
    <a
      aria-label={`Redigera ”${props.page.title}” i CMS:et`}
      className="handbook-edit"
      href={address}
      onClick={(event) => {
        event.preventDefault()
        openEditor(address)
      }}
    >
      <PencilIcon size={14} strokeWidth={2} />
      Redigera
    </a>
  )
}
