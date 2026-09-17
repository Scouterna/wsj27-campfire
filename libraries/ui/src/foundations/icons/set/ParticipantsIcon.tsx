import type { ReactElement } from "react"

import type { IconProps } from "../IconProps"
import { stroke } from "../stroke"

/**
 * The list of participants: two people side by side, the second slightly behind.
 * @param props The size and line weight asked for.
 * @returns The icon.
 */
export function ParticipantsIcon(props: IconProps): ReactElement {
  return stroke(
    [
      <path key="head" d="M9 4.6a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 0 1 0-6.8" />,
      <path key="body" d="M2.8 20c0-3.5 2.8-5.8 6.2-5.8s6.2 2.3 6.2 5.8" />,
      <path key="second-head" d="M16.4 5.4a3.4 3.4 0 0 1 0 6.6" />,
      <path key="second-body" d="M17.6 14.6c2.3.6 3.8 2.5 3.8 5.4" />,
    ],
    props,
  )
}
