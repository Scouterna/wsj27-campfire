import type { ReactElement } from "react"

import type { IconProps } from "../IconProps"
import { stroke } from "../stroke"

/**
 * Male: the Mars sign, a circle with an arrow leaving it up and to the right.
 * @param props The size and line weight asked for.
 * @returns The icon.
 */
export function GenderMaleIcon(props: IconProps): ReactElement {
  return stroke(
    [
      <circle key="ring" cx="10" cy="14" r="5.5" />,
      <path key="shaft" d="M13.9 10.1 20 4" />,
      <path key="head" d="M15 4h5v5" />,
    ],
    props,
  )
}
