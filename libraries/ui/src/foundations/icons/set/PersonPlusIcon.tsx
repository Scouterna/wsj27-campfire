import type { ReactElement } from "react"

import type { IconProps } from "../IconProps"
import { stroke } from "../stroke"

/**
 * Someone added: a head over shoulders, with a plus beside it.
 * @param props The size and line weight asked for.
 * @returns The icon.
 */
export function PersonPlusIcon(props: IconProps): ReactElement {
  return stroke(
    <>
      <circle cx="10" cy="8" r="4" />
      <path d="M2.5 20.5a7.5 7.5 0 0 1 15 0" />
      <path d="M19 8v6M16 11h6" />
    </>,
    props,
  )
}
