import type { ReactElement } from "react"

import type { IconProps } from "../IconProps"
import { stroke } from "../stroke"

/**
 * Send: an arrow pointing up, out of the field it sends from.
 * @param props The size and line weight asked for.
 * @returns The icon.
 */
export function SendIcon(props: IconProps): ReactElement {
  return stroke(
    <>
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </>,
    props,
  )
}
