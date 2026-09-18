import type { ReactElement } from "react"

import type { IconProps } from "../IconProps"
import { stroke } from "../stroke"

/**
 * Something somebody wrote: a speech bubble with its tail.
 * @param props The size and line weight asked for.
 * @returns The icon.
 */
export function ChatIcon(props: IconProps): ReactElement {
  return stroke(
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-5 4z" />,
    props,
  )
}
