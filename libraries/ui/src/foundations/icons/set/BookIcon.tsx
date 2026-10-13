import type { ReactElement } from "react"

import type { IconProps } from "../IconProps"
import { stroke } from "../stroke"

/**
 * The handbook: a book lying open, its two pages meeting at the spine.
 * @param props The size and line weight asked for.
 * @returns The icon.
 */
export function BookIcon(props: IconProps): ReactElement {
  return stroke(
    [
      <path key="left" d="M12 6.6C10.2 5.2 7.4 4.6 3.4 4.8v13.4c4-.2 6.8.4 8.6 1.8" />,
      <path key="right" d="M12 6.6c1.8-1.4 4.6-2 8.6-1.8v13.4c-4-.2-6.8.4-8.6 1.8" />,
      <path key="spine" d="M12 6.6V20" />,
    ],
    props,
  )
}
