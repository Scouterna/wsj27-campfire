import type { ReactElement } from "react"

import type { IconProps } from "../IconProps"
import { stroke } from "../stroke"

/**
 * A letter with a plus beside it – making text larger.
 * @param props The size and line weight asked for.
 * @returns The icon.
 */
export function TextLargerIcon(props: IconProps): ReactElement {
  return stroke(
    [<path key="letter" d="M3 6.5h11M8.5 6.5V20" />, <path key="plus" d="M16.5 10h5M19 7.5v5" />],
    props,
  )
}
