import type { ReactElement } from "react"

import type { IconProps } from "../IconProps"
import { stroke } from "../stroke"

/**
 * Somebody: a head over shoulders.
 * @param props The size and line weight asked for.
 * @returns The icon.
 */
export function PersonIcon(props: IconProps): ReactElement {
  return stroke(
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </>,
    props,
  )
}
