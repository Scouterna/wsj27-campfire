import type { ReactElement } from "react"

import type { IconProps } from "../IconProps"
import { stroke } from "../stroke"

/**
 * An email address: the envelope and its flap.
 * @param props The size and line weight asked for.
 * @returns The icon.
 */
export function MailIcon(props: IconProps): ReactElement {
  return stroke(
    [
      <rect key="envelope" x="3" y="5" width="18" height="14" rx="2" />,
      <path key="flap" d="m3.5 7 8.5 6.5L20.5 7" />,
    ],
    props,
  )
}
