import type { ReactElement } from "react"

import type { IconProps } from "../IconProps"
import { stroke } from "../stroke"

/**
 * Female: the Venus sign, a circle over a cross.
 * @param props The size and line weight asked for.
 * @returns The icon.
 */
export function GenderFemaleIcon(props: IconProps): ReactElement {
  return stroke(
    [
      <circle key="ring" cx="12" cy="9" r="5.5" />,
      <path key="stem" d="M12 14.5V22" />,
      <path key="bar" d="M8.5 18.5h7" />,
    ],
    props,
  )
}
