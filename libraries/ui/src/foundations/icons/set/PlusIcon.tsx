import type { ReactElement } from "react"

import type { IconProps } from "../IconProps"
import { stroke } from "../stroke"

/**
 * Add: the plus.
 * @param props The size and line weight asked for.
 * @returns The icon.
 */
export function PlusIcon(props: IconProps): ReactElement {
  return stroke(<path d="M12 5v14M5 12h14" />, props)
}
