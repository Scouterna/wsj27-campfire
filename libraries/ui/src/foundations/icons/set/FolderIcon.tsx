import type { ReactElement } from "react"

import type { IconProps } from "../IconProps"
import { stroke } from "../stroke"

/**
 * A folder – the material section, and a folder inside it.
 * @param props The size and line weight asked for.
 * @returns The icon.
 */
export function FolderIcon(props: IconProps): ReactElement {
  return stroke(
    [
      <path key="tab" d="M3.2 6.6a1.4 1.4 0 0 1 1.4-1.4h4.2l2 2.4h7.6a1.4 1.4 0 0 1 1.4 1.4" />,
      <path key="body" d="M3.2 6.6v11a1.4 1.4 0 0 0 1.4 1.4h14.8a1.4 1.4 0 0 0 1.4-1.4V9" />,
    ],
    props,
  )
}
