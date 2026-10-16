import type { ReactElement } from "react"

import type { IconProps } from "../IconProps"
import { stroke } from "../stroke"

/**
 * A triangle under an arrow curving to the right – turning something a quarter
 * clockwise.
 * @param props The size and line weight asked for.
 * @returns The icon.
 */
export function RotateRightIcon(props: IconProps): ReactElement {
  return stroke(
    [
      <path key="shape" d="M20.5 20.5h-11l11-11z" />,
      <path key="arc" d="M3.5 13A8.5 8.5 0 0 1 12 4.5" />,
      <path key="head" d="m9.5 2 2.5 2.5L9.5 7" />,
    ],
    props,
  )
}
