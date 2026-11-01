import type { ReactElement } from "react"

import type { IconProps } from "../IconProps"
import { stroke } from "../stroke"

/**
 * A triangle under an arrow curving to the left – turning something a quarter
 * counterclockwise.
 * @param props The size and line weight asked for.
 * @returns The icon.
 */
export function RotateLeftIcon(props: IconProps): ReactElement {
  return stroke(
    [
      <path key="shape" d="M3.5 20.5h11l-11-11z" />,
      <path key="arc" d="M20.5 13a8.5 8.5 0 0 0-8.5-8.5" />,
      <path key="head" d="m14.5 2-2.5 2.5 2.5 2.5" />,
    ],
    props,
  )
}
