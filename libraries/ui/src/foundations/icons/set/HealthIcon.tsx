import type { ReactElement } from "react"

import type { IconProps } from "../IconProps"
import { stroke } from "../stroke"

/**
 * Health – a heart with a pulse running through it.
 * @param props The size and line weight asked for.
 * @returns The icon.
 */
export function HealthIcon(props: IconProps): ReactElement {
  return stroke(
    [
      <path
        key="heart"
        d="M12 20s-7.5-4.6-8.6-9.6A4.6 4.6 0 0 1 12 6.6a4.6 4.6 0 0 1 8.6 3.8C19.5 15.4 12 20 12 20z"
      />,
      <path key="pulse" d="M5.5 12.5h3.2l1.6-2.6 2.4 4.4 1.6-1.8h4.2" />,
    ],
    props,
  )
}
