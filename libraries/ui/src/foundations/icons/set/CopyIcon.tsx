import type { ReactElement } from "react"

import type { IconProps } from "../IconProps"
import { stroke } from "../stroke"

/**
 * Copy to the clipboard: one sheet, and the corner of the one it was taken from.
 * @param props The size and line weight asked for.
 * @returns The icon.
 */
export function CopyIcon(props: IconProps): ReactElement {
  return stroke(
    [
      <rect key="copy" x="9" y="9" width="12" height="12" rx="2" />,
      <path key="original" d="M15 9V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h4" />,
    ],
    props,
  )
}
