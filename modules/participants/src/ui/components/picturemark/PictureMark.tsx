import { PictureOffIcon } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import { picturesWithheldLabel } from "../../../model/pictures"
import "./PictureMark.css"

/**
 * That pictures of a person may not be published, as a quiet grey sign a screen reader
 * reads in words. Only a no is drawn, so it takes nothing.
 * @returns The sign.
 */
export function PictureMark(): ReactElement {
  return (
    <span aria-label={picturesWithheldLabel} className="picture-mark" role="img">
      <PictureOffIcon />
    </span>
  )
}
