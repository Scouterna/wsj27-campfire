import type { ReactElement } from "react"

import type { IconProps } from "../IconProps"
import { stroke } from "../stroke"

/**
 * A picture: a frame with a sun over a ridge of hills.
 * @param props The size and line weight asked for.
 * @returns The icon.
 */
export function PictureIcon(props: IconProps): ReactElement {
  return stroke(
    <>
      <rect height="14" rx="3" width="18" x="3" y="5" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="m5 18 5-5 3 3 3-3 3 3" />
    </>,
    props,
  )
}
