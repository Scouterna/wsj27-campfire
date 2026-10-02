import type { ReactElement } from "react"

import type { IconProps } from "../IconProps"
import { stroke } from "../stroke"

/**
 * More: three dots, the overflow menu's trigger.
 * @param props The size and line weight asked for.
 * @returns The icon.
 */
export function MoreIcon(props: IconProps): ReactElement {
  // Filled rather than stroked, because a stroked dot is only as wide as the line, which
  // is too small to read as a dot.
  return stroke(
    [5.2, 12, 18.8].map((cx) => (
      <circle cx={cx} cy={12} fill="currentColor" key={cx} r={1.8} stroke="none" />
    )),
    props,
  )
}
