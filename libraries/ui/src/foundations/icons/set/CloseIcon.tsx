import type { ReactElement } from "react"

import type { IconProps } from "../IconProps"
import { stroke } from "../stroke"

/**
 * Close: the cross that dismisses what it sits on.
 * @param props The size and line weight asked for.
 * @returns The icon.
 */
export function CloseIcon(props: IconProps): ReactElement {
  return stroke(<path d="M6 6l12 12M18 6 6 18" />, props)
}
