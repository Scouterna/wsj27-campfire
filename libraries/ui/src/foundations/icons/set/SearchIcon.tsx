import type { ReactElement } from "react"

import type { IconProps } from "../IconProps"
import { stroke } from "../stroke"

/**
 * Search: the glass and its handle.
 * @param props The size and line weight asked for.
 * @returns The icon.
 */
export function SearchIcon(props: IconProps): ReactElement {
  return stroke(
    [<circle key="glass" cx="11" cy="11" r="7" />, <path key="handle" d="m16.5 16.5 4 4" />],
    props,
  )
}
