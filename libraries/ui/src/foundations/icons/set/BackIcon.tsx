import type { ReactElement } from "react"

import type { IconProps } from "../IconProps"
import { stroke } from "../stroke"

/**
 * Back: the chevron ahead of a parent's name.
 * @param props The size and line weight asked for.
 * @returns The icon.
 */
export function BackIcon(props: IconProps): ReactElement {
  return stroke([<path key="chevron" d="M14.4 5.6 8 12l6.4 6.4" />], props)
}
