import type { ReactElement } from "react"

import type { IconProps } from "../IconProps"
import { stroke } from "../stroke"

/**
 * More: three dots, the overflow menu's trigger.
 * @param props The size and line weight asked for.
 * @returns The icon.
 */
export function MoreIcon(props: IconProps): ReactElement {
  return stroke(
    [
      <path key="left" d="M5.2 12h.01" />,
      <path key="middle" d="M12 12h.01" />,
      <path key="right" d="M18.8 12h.01" />,
    ],
    props,
  )
}
