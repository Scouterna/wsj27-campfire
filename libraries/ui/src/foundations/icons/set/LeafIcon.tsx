import type { ReactElement } from "react"

import type { IconProps } from "../IconProps"
import { stroke } from "../stroke"

/**
 * Food and allergies – a leaf and its vein.
 * @param props The size and line weight asked for.
 * @returns The icon.
 */
export function LeafIcon(props: IconProps): ReactElement {
  return stroke(
    [
      <path key="leaf" d="M5 19C3.6 10.4 8.4 4.4 20 4c.6 11.4-5.6 16.4-15 15z" />,
      <path key="vein" d="M3.5 20.5C7 16 10.5 12.5 15 9" />,
    ],
    props,
  )
}
