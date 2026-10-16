import type { ReactElement } from "react"

import type { IconProps } from "../IconProps"
import { stroke } from "../stroke"

/**
 * A picture – the social media image maker.
 * @param props The size and line weight asked for.
 * @returns The icon.
 */
export function ImageIcon(props: IconProps): ReactElement {
  return stroke(
    [
      <rect key="frame" x="3.2" y="5" width="17.6" height="14" rx="2" />,
      <path key="hill" d="M3.6 16.2 8.6 11.4l4.2 4 2.8-2.4 4.8 4.2" />,
      <circle key="sun" cx="15.4" cy="9.4" r="1.5" />,
    ],
    props,
  )
}
