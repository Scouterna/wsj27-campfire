import type { ReactElement } from "react"

import type { IconProps } from "../IconProps"
import { stroke } from "../stroke"

/**
 * An arrow down into a tray – saving something to the device.
 * @param props The size and line weight asked for.
 * @returns The icon.
 */
export function DownloadIcon(props: IconProps): ReactElement {
  return stroke(
    [
      <path key="arrow" d="M12 4v11m-4.4-4.4L12 15l4.4-4.4" />,
      <path key="tray" d="M4.4 15.6v2.2a1.4 1.4 0 0 0 1.4 1.4h12.4a1.4 1.4 0 0 0 1.4-1.4v-2.2" />,
    ],
    props,
  )
}
