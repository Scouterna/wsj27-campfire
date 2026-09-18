import type { ReactElement } from "react"

import type { IconProps } from "../IconProps"
import { stroke } from "../stroke"

/**
 * A phone number: the handset.
 * @param props The size and line weight asked for.
 * @returns The icon.
 */
export function PhoneIcon(props: IconProps): ReactElement {
  return stroke(
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />,
    props,
  )
}
