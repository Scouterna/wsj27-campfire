import type { ReactElement } from "react"

import { baseName, typeName } from "../../../model/format"
import type { MaterialFile } from "../../../model/MaterialNode"
import { DownloadLink } from "./DownloadLink"
import { MaterialTile, type TileTone } from "./MaterialTile"

export interface FileTileProps {
  /**
   * The file.
   */
  readonly file: MaterialFile
  /**
   * The quiet line under the name.
   */
  readonly meta: string
  /**
   * The backdrop the file was drawn for.
   */
  readonly tone: TileTone
}

/**
 * One file as a tile, with its one download under it.
 * @param props The file, what to say under its name, and its backdrop.
 * @returns The tile.
 */
export function FileTile(props: FileTileProps): ReactElement {
  return (
    <MaterialTile
      label={baseName(props.file.name)}
      meta={props.meta}
      picture={props.file.pictureUrl}
      placeholder={typeName(props.file)}
      thumbnail={props.file.thumbnailUrl}
      tone={props.tone}
      // A picture shows a whole image, but only the first page of a document.
      viewerUrl={props.file.mimeType.startsWith("image/") ? undefined : props.file.viewerUrl}
    >
      <DownloadLink fileName={props.file.name} href={props.file.downloadUrl} />
    </MaterialTile>
  )
}
