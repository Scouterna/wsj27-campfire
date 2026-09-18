import type { ReactElement } from "react"

import type { IconProps } from "../IconProps"
import { stroke } from "../stroke"

/**
 * An identity document: a portrait on a card, with the lines beside it.
 * @param props The size and line weight asked for.
 * @returns The icon.
 */
export function IdCardIcon(props: IconProps): ReactElement {
  return stroke(
    [
      <rect key="card" x="2.5" y="5" width="19" height="14" rx="2.5" />,
      <circle key="head" cx="8.5" cy="11" r="2.2" />,
      <path key="shoulders" d="M5.5 16.5c.6-1.6 1.7-2.4 3-2.4s2.4.8 3 2.4" />,
      <path key="line-one" d="M14.5 9.5h4" />,
      <path key="line-two" d="M14.5 13h4" />,
    ],
    props,
  )
}
