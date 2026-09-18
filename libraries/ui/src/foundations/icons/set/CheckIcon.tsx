import type { ReactElement } from "react"

import type { IconProps } from "../IconProps"
import { stroke } from "../stroke"

/**
 * Done: the check mark.
 * @param props The size and line weight asked for.
 * @returns The icon.
 */
export function CheckIcon(props: IconProps): ReactElement {
  return stroke(<path d="m5 13 4 4 10-10" />, props)
}
