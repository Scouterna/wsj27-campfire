import type { ReactElement } from "react"

import type { IconProps } from "../IconProps"
import { stroke } from "../stroke"

/**
 * Change: a pencil at an angle.
 * @param props The size and line weight asked for.
 * @returns The icon.
 */
export function PencilIcon(props: IconProps): ReactElement {
  return stroke(
    <>
      <path d="M15.5 5.5 18.5 8.5" />
      <path d="M4 20l1-4L16 5a2.1 2.1 0 0 1 3 3L8 19z" />
    </>,
    props,
  )
}
