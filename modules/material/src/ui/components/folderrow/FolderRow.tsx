import { FolderIcon, Row } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import { fileCount } from "../../../model/format"
import type { MaterialFolder } from "../../../model/MaterialNode"
import { countFiles } from "../../../model/tree"

import "./FolderRow.css"

export interface FolderRowProps {
  /**
   * The folder the row opens.
   */
  readonly folder: MaterialFolder
}

/**
 * A folder as a row: its mark, its name, and how many files are under it, leading to the
 * folder's own screen.
 * @param props The folder.
 * @returns The row.
 */
export function FolderRow(props: FolderRowProps): ReactElement {
  return (
    <Row
      leading={
        <span className="folder-row-mark" aria-hidden="true">
          <FolderIcon size={20} />
        </span>
      }
      link={{ params: { folder: props.folder.id }, to: "/material/$folder" }}
    >
      <strong>{props.folder.name}</strong>
      <small>{fileCount(countFiles(props.folder))}</small>
    </Row>
  )
}
