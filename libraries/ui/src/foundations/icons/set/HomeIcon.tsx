import type { ReactElement } from "react"

import type { IconProps } from "../IconProps"
import { stroke } from "../stroke"

/**
 * Home: the house and its door.
 * @param props The size and line weight asked for.
 * @returns The icon.
 */
export function HomeIcon(props: IconProps): ReactElement {
  return stroke(
    [
      <path key="roof" d="M3.2 11.2 12 4.2l8.8 7" />,
      <path key="walls" d="M5.6 10.2v9.6h12.8v-9.6" />,
      <path key="door" d="M10.4 19.8v-5.2h3.2v5.2" />,
    ],
    props,
  )
}
